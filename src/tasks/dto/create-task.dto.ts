import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsArray } from 'class-validator';
import { TaskStatus } from '../../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  progress?: number;

  @IsDateString()
  @IsOptional()
  assignedDate?: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  assignedToIds?: number[];

  @IsNumber()
  @IsOptional()
  assignedById?: number;

  @IsNumber()
  @IsOptional()
  relatedLeadId?: number;

  @IsNumber()
  @IsOptional()
  relatedContactId?: number;

  @IsNumber()
  @IsOptional()
  relatedCampaignId?: number;

  @IsNumber()
  @IsOptional()
  relatedMindfulnessId?: number;

  @IsNumber()
  @IsOptional()
  relatedRevenueId?: number;

  @IsOptional()
  @IsArray()
  attachments?: { url: string; name: string }[];

  @IsOptional()
  @IsArray()
  links?: { url: string; title: string }[];
}
