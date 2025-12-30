import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Lead } from '../entities/lead.entity';
import { Revenue } from '../entities/revenue.entity';
import { Task } from '../entities/task.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Revenue,
      Task,
      Contact,
      Campaign,
      User
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
