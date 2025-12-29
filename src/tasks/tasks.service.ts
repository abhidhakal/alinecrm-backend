import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Role } from '../auth/role.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { assignedToIds, assignedById, relatedLeadId, relatedContactId, relatedCampaignId, relatedMindfulnessId, relatedRevenueId, ...taskData } = createTaskDto;

    const task = this.taskRepository.create({
      ...taskData,
      institutionId: user.institutionId, // Assign institution
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

    return this.taskRepository.save(task);
  }

  async findAll(user: User): Promise<Task[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.taskRepository.find({
        where: { institutionId: user.institutionId }, // Restrict to institution
        relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact', 'relatedCampaign', 'relatedMindfulness', 'relatedRevenue'],
        order: { createdAt: 'DESC' },
      });
    }

    // For regular users, find tasks they created OR are assigned to, within their institution
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
      where: { id, institutionId: user.institutionId }, // Check institution
      relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact', 'relatedCampaign', 'relatedMindfulness', 'relatedRevenue'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return task;
    }

    // Check if user has access (creator or assignee)
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

    return this.taskRepository.save(task);
  }

  async remove(id: number, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      await this.taskRepository.remove(task);
      return;
    }

    // Only allow creator to delete? Or assignees too? 
    // For now, let's allow both if they have access, or maybe restrict to creator.
    // Let's restrict delete to creator for better security.
    if (task.assignedBy?.id !== user.id) {
      throw new ForbiddenException('Only the creator can delete this task');
    }

    await this.taskRepository.remove(task);
  }
}
