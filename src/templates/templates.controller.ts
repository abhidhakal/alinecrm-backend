import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { EmailTemplate } from '../entities/email-template.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) { }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(+id);
  }

  @Post()
  create(@Body() data: Partial<EmailTemplate>) {
    return this.templatesService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<EmailTemplate>) {
    return this.templatesService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(+id);
  }
}
