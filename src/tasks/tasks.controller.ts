import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.tasksService.create(createTaskDto, user);
  }

  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId } as User;
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.tasksService.remove(id, user);
  }
}
