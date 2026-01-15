import { Controller, Get, Query, UseGuards, Req, Res, Post } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  connect(@Req() req) {
    return this.googleCalendarService.getAuthUrl(req.user.id);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    // If running locally, we might want to redirect to localhost. 
    // Ideally this comes from ENV.
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      await this.googleCalendarService.handleCallback(code, state);
      // Redirect to frontend settings with success param
      // Note: adjust the path /employee/settings if your routing differs
      return res.redirect(`${frontendUrl}/employee/settings?google_connect=success`);
    } catch (error) {
      console.error('Google Calendar Connection Error:', error);
      return res.redirect(`${frontendUrl}/employee/settings?google_connect=error`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('disconnect')
  disconnect(@Req() req) {
    return this.googleCalendarService.disconnect(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  async syncTasks(@Req() req) {
    return this.googleCalendarService.syncAllTasks(req.user.id);
  }
}
