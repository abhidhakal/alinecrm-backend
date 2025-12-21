import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { assignedToIds, assignedById, relatedLeadId, relatedContactId, ...taskData } = createTaskDto;

    const task = this.taskRepository.create(taskData);

    if (assignedToIds && assignedToIds.length > 0) {
      task.assignedTo = await this.userRepository.findBy({ id: In(assignedToIds) });
    }

    if (assignedById) {
      task.assignedBy = await this.userRepository.findOneBy({ id: assignedById });
    }

    // Set related entities if needed (assuming simplified for now)
    if (relatedLeadId) {
      task.relatedLead = { id: relatedLeadId } as any;
    }
    if (relatedContactId) {
      task.relatedContact = { id: relatedContactId } as any;
    }

    return this.taskRepository.save(task);
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find({
      relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'assignedBy', 'relatedLead', 'relatedContact'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const { assignedToIds, assignedById, relatedLeadId, relatedContactId, ...taskData } = updateTaskDto;

    const task = await this.findOne(id);

    // Merge basic fields
    Object.assign(task, taskData);

    if (assignedToIds !== undefined) {
      if (assignedToIds.length > 0) {
        task.assignedTo = await this.userRepository.findBy({ id: In(assignedToIds) });
      } else {
        task.assignedTo = [];
      }
    }

    if (assignedById !== undefined) {
      task.assignedBy = assignedById ? await this.userRepository.findOneBy({ id: assignedById }) : null;
    }

    // Update relations if provided
    if (relatedLeadId !== undefined) {
      task.relatedLead = relatedLeadId ? { id: relatedLeadId } as any : null;
    }
    if (relatedContactId !== undefined) {
      task.relatedContact = relatedContactId ? { id: relatedContactId } as any : null;
    }

    return this.taskRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const result = await this.taskRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }
}
