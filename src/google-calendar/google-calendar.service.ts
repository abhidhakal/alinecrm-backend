import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleCalendarService {
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    private jwtService: JwtService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const redirectUri = `${backendUrl}/google-calendar/callback`;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  // ============ OAuth Methods ============

  getAuthUrl(userId: number) {
    const stateToken = this.jwtService.sign({ sub: userId }, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '5m'
    });

    const scopes = ['https://www.googleapis.com/auth/calendar'];

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: stateToken,
      include_granted_scopes: true
    });

    return { url };
  }

  async handleCallback(code: string, state: string) {
    let userId: number;
    try {
      const payload = this.jwtService.verify(state, {
        secret: this.configService.get('JWT_SECRET')
      });
      userId = payload.sub;
    } catch (e) {
      throw new Error('Invalid authentication state');
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    const updates: Partial<User> = { isGoogleCalendarConnected: true };

    if (tokens.refresh_token) {
      updates.googleRefreshToken = tokens.refresh_token;
    }

    await this.userRepository.update(userId, updates);

    return { success: true };
  }

  async disconnect(userId: number) {
    await this.userRepository.update(userId, {
      googleRefreshToken: undefined as any,
      isGoogleCalendarConnected: false
    });
    return { message: 'Disconnected successfully' };
  }

  // ============ Calendar Event Methods ============

  /**
   * Get an authenticated Calendar client for a specific user
   */
  private async getCalendarClient(userId: number): Promise<calendar_v3.Calendar | null> {
    // Get user with refresh token
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.googleRefreshToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user?.googleRefreshToken || !user.isGoogleCalendarConnected) {
      return null;
    }

    // Set credentials
    this.oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a Google Calendar event for a task
   */
  async createEvent(task: Task, userId: number): Promise<string | null> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) {
      console.log('User not connected to Google Calendar');
      return null;
    }

    try {
      // Format the due date as an all-day event
      const dueDate = new Date(task.dueDate);
      const dateStr = dueDate.toISOString().split('T')[0];

      const event: calendar_v3.Schema$Event = {
        summary: task.title,
        description: task.description || '',
        start: {
          date: dateStr, // All-day event
        },
        end: {
          date: dateStr,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 }, // 1 hour before
            { method: 'popup', minutes: 1440 }, // 1 day before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      const eventId = response.data.id;

      // Save the event ID to the task
      if (eventId) {
        await this.taskRepository.update(task.id, { googleEventId: eventId });
      }

      console.log(`Created Google Calendar event: ${eventId}`);
      return eventId || null;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  }

  /**
   * Update a Google Calendar event when task is modified
   */
  async updateEvent(task: Task, userId: number): Promise<boolean> {
    if (!task.googleEventId) {
      // No existing event, create one
      await this.createEvent(task, userId);
      return true;
    }

    const calendar = await this.getCalendarClient(userId);
    if (!calendar) {
      return false;
    }

    try {
      const dueDate = new Date(task.dueDate);
      const dateStr = dueDate.toISOString().split('T')[0];

      const event: calendar_v3.Schema$Event = {
        summary: task.title,
        description: task.description || '',
        start: {
          date: dateStr,
        },
        end: {
          date: dateStr,
        },
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: task.googleEventId,
        requestBody: event,
      });

      console.log(`Updated Google Calendar event: ${task.googleEventId}`);
      return true;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  }

  /**
   * Delete a Google Calendar event when task is deleted
   */
  async deleteEvent(task: Task, userId: number): Promise<boolean> {
    if (!task.googleEventId) {
      return true; // Nothing to delete
    }

    const calendar = await this.getCalendarClient(userId);
    if (!calendar) {
      return false;
    }

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: task.googleEventId,
      });

      console.log(`Deleted Google Calendar event: ${task.googleEventId}`);
      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  /**
   * Sync all existing tasks for a user to their Google Calendar
   * (Can be called when user first connects)
   */
  async syncAllTasks(userId: number): Promise<{ synced: number; failed: number }> {
    const tasks = await this.taskRepository.find({
      where: {
        assignedTo: { id: userId },
        googleEventId: undefined as any, // Only tasks not yet synced
      }
    });

    let synced = 0;
    let failed = 0;

    for (const task of tasks) {
      const eventId = await this.createEvent(task, userId);
      if (eventId) {
        synced++;
      } else {
        failed++;
      }
    }

    return { synced, failed };
  }
}
