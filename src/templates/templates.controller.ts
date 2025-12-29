import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { EmailTemplate } from '../entities/email-template.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) { }

  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.templatesService.findAll(user.institutionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.templatesService.findOne(+id, user.institutionId);
  }

  @Post()
  create(@Body() data: Partial<EmailTemplate>, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.templatesService.create(data, user.institutionId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<EmailTemplate>, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.templatesService.update(+id, data, user.institutionId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.templatesService.remove(+id, user.institutionId);
  }
}
