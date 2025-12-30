import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { TasksModule } from './tasks/tasks.module';
import { LeadsModule } from './leads/leads.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TemplatesModule } from './templates/templates.module';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { Contact } from './entities/contact.entity';
import { Lead } from './entities/lead.entity';
import { Revenue } from './entities/revenue.entity';
import { Task } from './entities/task.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign_recipient.entity';
import { Mindfulness } from './entities/mindfulness.entity';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { EmailEvent } from './entities/email-event.entity';
import { UnsubscribedEmail } from './entities/unsubscribed-email.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { Institution } from './entities/institution.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes process.env available everywhere
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        Institution, // Multi-tenancy core entity
        Role, User,
        Contact, Lead, Revenue, Task, Campaign, CampaignRecipient, Mindfulness,
        // Email Campaign entities
        EmailCampaign, EmailCampaignRecipient, EmailEvent, UnsubscribedEmail, EmailTemplate,
      ],
      synchronize: true, // Auto-create tables (disable in production)
      logging: false,
    }),
    AuthModule,
    ContactsModule,
    TasksModule,
    LeadsModule,
    UsersModule,
    UploadModule,
    DashboardModule,
    CampaignsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
