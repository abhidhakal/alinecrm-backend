import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { WebhooksController, UnsubscribeController } from './webhooks.controller';
import { BrevoProvider } from './providers/brevo.provider';
import { EmailCampaign } from '../entities/email-campaign.entity';
import { EmailCampaignRecipient } from '../entities/email-campaign-recipient.entity';
import { EmailEvent } from '../entities/email-event.entity';
import { UnsubscribedEmail } from '../entities/unsubscribed-email.entity';
import { Contact } from '../entities/contact.entity';
import { Lead } from '../entities/lead.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      EmailCampaign,
      EmailCampaignRecipient,
      EmailEvent,
      UnsubscribedEmail,
      Contact,
      Lead,
    ]),
  ],
  controllers: [CampaignsController, WebhooksController, UnsubscribeController],
  providers: [CampaignsService, BrevoProvider],
  exports: [CampaignsService],
})
export class CampaignsModule { }
