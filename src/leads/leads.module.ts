import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Lead } from '../entities/lead.entity';
import { Contact } from '../entities/contact.entity';
import { Revenue } from '../entities/revenue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Contact, Revenue])],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
