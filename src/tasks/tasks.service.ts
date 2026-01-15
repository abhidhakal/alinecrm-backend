import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Role } from '../auth/role.enum';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) { }

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { assignedToIds, assignedById, relatedLeadId, relatedContactId, relatedCampaignId, relatedMindfulnessId, relatedRevenueId, ...taskData } = createTaskDto;

    const task = this.taskRepository.create({
      ...taskData,
      institutionId: user.institutionId,
    });

    // Set the creator
    task.assignedBy = user;

    if (user.role === Role.User) {
      task.assignedTo = [user];
    } else if (assignedToIds && assignedToIds.length > 0) {
      task.assignedTo = await this.userRepository.findBy({ id: In(assignedToIds) });
    } else {
      task.assignedTo = [user];
    }

    // Set related entities if needed
    if (relatedLeadId) {
      task.relatedLead = { id: relatedLeadId } as any;
    }
    if (relatedContactId) {
      task.relatedContact = { id: relatedContactId } as any;
    }
    if (relatedCampaignId) {
      task.relatedCampaign = { id: relatedCampaignId } as any;
    }
    if (relatedMindfulnessId) {
      task.relatedMindfulness = { id: relatedMindfulnessId } as any;
    }
    if (relatedRevenueId) {
      task.relatedRevenue = { id: relatedRevenueId } as any;
    }

    const savedTask = await this.taskRepository.save(task);

    // Sync to Google Calendar for the creator (if connected)
    this.syncTaskToGoogleCalendar(savedTask, user.id, 'create');

    return savedTask;
  }

  async findAll(user: User): Promise<Task[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.taskRepository.find({
        where: { institutionId: user.institutionId },
        relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact', 'relatedCampaign', 'relatedMindfulness', 'relatedRevenue'],
        order: { createdAt: 'DESC' },
      });
    }

    const qb = this.taskRepository.createQueryBuilder('task')
      .leftJoin('task.assignedTo', 'assignee')
      .leftJoin('task.assignedBy', 'creator')
      .select('task.id')
      .where('task.institutionId = :institutionId', { institutionId: user.institutionId })
      .andWhere(new Brackets(qb => {
        qb.where('creator.id = :userId', { userId: user.id })
          .orWhere('assignee.id = :userId', { userId: user.id });
      }));

    const tasks = await qb.getMany();
    const taskIds = tasks.map(t => t.id);

    if (taskIds.length === 0) {
      return [];
    }

    return this.taskRepository.find({
      where: { id: In(taskIds) },
      relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact', 'relatedCampaign', 'relatedMindfulness', 'relatedRevenue'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, institutionId: user.institutionId },
      relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact', 'relatedCampaign', 'relatedMindfulness', 'relatedRevenue'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return task;
    }

    const isCreator = task.assignedBy?.id === user.id;
    const isAssignee = task.assignedTo?.some(assignee => assignee.id === user.id);

    if (!isCreator && !isAssignee) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
    const { assignedToIds, assignedById, relatedLeadId, relatedContactId, relatedCampaignId, relatedMindfulnessId, relatedRevenueId, ...taskData } = updateTaskDto;

    const task = await this.findOne(id, user);

    // Merge basic fields
    Object.assign(task, taskData);

    if (assignedToIds !== undefined) {
      if (assignedToIds.length > 0) {
        task.assignedTo = await this.userRepository.findBy({ id: In(assignedToIds) });
      } else {
        task.assignedTo = [];
      }
    }

    // Update relations if provided
    if (relatedLeadId !== undefined) {
      task.relatedLead = relatedLeadId ? { id: relatedLeadId } as any : null;
    }
    if (relatedContactId !== undefined) {
      task.relatedContact = relatedContactId ? { id: relatedContactId } as any : null;
    }
    if (relatedCampaignId !== undefined) {
      task.relatedCampaign = relatedCampaignId ? { id: relatedCampaignId } as any : null;
    }
    if (relatedMindfulnessId !== undefined) {
      task.relatedMindfulness = relatedMindfulnessId ? { id: relatedMindfulnessId } as any : null;
    }
    if (relatedRevenueId !== undefined) {
      task.relatedRevenue = relatedRevenueId ? { id: relatedRevenueId } as any : null;
    }

    const savedTask = await this.taskRepository.save(task);

    // Sync to Google Calendar
    this.syncTaskToGoogleCalendar(savedTask, user.id, 'update');

    return savedTask;
  }

  async remove(id: number, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    // Delete from Google Calendar first (before removing from DB)
    await this.syncTaskToGoogleCalendar(task, user.id, 'delete');

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      await this.taskRepository.remove(task);
      return;
    }

    if (task.assignedBy?.id !== user.id) {
      throw new ForbiddenException('Only the creator can delete this task');
    }

    await this.taskRepository.remove(task);
  }

  /**
   * Sync task to Google Calendar (fire-and-forget, non-blocking)
   */
  private syncTaskToGoogleCalendar(task: Task, userId: number, action: 'create' | 'update' | 'delete') {
    // Run asynchronously without awaiting to avoid slowing down the API response
    (async () => {
      try {
        switch (action) {
          case 'create':
            await this.googleCalendarService.createEvent(task, userId);
            break;
          case 'update':
            await this.googleCalendarService.updateEvent(task, userId);
            break;
          case 'delete':
            await this.googleCalendarService.deleteEvent(task, userId);
            break;
        }
      } catch (error) {
        console.error(`Failed to sync task ${task.id} to Google Calendar:`, error);
      }
    })();
  }
}
