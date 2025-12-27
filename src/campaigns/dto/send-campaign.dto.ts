import { IsOptional, IsBoolean } from 'class-validator';

export class SendCampaignDto {
  @IsBoolean()
  @IsOptional()
  immediate?: boolean; // If true, send immediately ignoring scheduled time
}
