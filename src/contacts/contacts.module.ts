
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from '../entities/contact.entity';
import { User } from '../entities/user.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, User]),
    NotificationModule,
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule { }
