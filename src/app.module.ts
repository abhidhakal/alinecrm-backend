import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { Contact } from './entities/contact.entity';
import { Lead } from './entities/lead.entity';
import { Task } from './entities/task.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign_recipient.entity';
import { Mindfulness } from './entities/mindfulness.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes process.env available everywhere
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        Role, User,
        Contact, Lead, Task, Campaign, CampaignRecipient, Mindfulness
      ],
      synchronize: true, // Auto-create tables (disable in production)
      logging: false,
    }),
    AuthModule,
    // other modules like AuthModule can be added here later
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

