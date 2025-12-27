import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, Min, Max, IsArray } from 'class-validator';
import { LeadStatus, LeadSource } from '../../entities/lead.entity';

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

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  inquiredFor?: string;

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

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  assignedToIds?: number[];
}
