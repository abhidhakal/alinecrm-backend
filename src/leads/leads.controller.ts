import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { User } from '../entities/user.entity';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Post()
  create(@Body() createLeadDto: CreateLeadDto, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.leadsService.create(createLeadDto, user);
  }

  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.leadsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.leadsService.findOne(+id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.leadsService.update(+id, updateLeadDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.leadsService.remove(+id, user);
  }
}
