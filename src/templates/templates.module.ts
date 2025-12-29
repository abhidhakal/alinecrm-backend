import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { EmailTemplate } from '../entities/email-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule { }
