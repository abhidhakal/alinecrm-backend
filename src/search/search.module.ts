import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Lead } from '../entities/lead.entity';
import { Contact } from '../entities/contact.entity';
import { Task } from '../entities/task.entity';
import { Campaign } from '../entities/campaign.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Contact, Task, Campaign])
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule { }
