import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { LeadStatus } from '../../entities/lead.entity';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  potentialValue?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  contactId?: number;

  @IsNumber()
  @IsOptional()
  assignedToId?: number;
}
