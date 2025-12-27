import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AudienceSource, CampaignProvider } from '../../entities/email-campaign.entity';

// Audience filter DTO for validation
export class AudienceFiltersDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @IsOptional()
  @IsDateString()
  createdAtTo?: string;

  @IsOptional()
  @IsBoolean()
  hasEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priority?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leadSource?: string[];
}

export class AudienceFilterDto {
  @IsEnum(AudienceSource)
  @IsNotEmpty()
  source: AudienceSource;

  @IsObject()
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  filters: AudienceFiltersDto;
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  previewText?: string;

  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsEmail()
  @IsNotEmpty()
  senderEmail: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsEnum(CampaignProvider)
  @IsOptional()
  provider?: CampaignProvider;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  @IsNotEmpty()
  audienceFilters: AudienceFilterDto;
}
