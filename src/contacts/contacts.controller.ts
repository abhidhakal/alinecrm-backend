
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) { }

  @Post()
  create(@Body() createContactDto: CreateContactDto, @Request() req) {
    // Construct a partial User object with just the ID, which is sufficient for TypeORM relations
    const user = { id: req.user.userId } as User;
    return this.contactsService.create(createContactDto, user);
  }

  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId } as User;
    return this.contactsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.contactsService.findOne(+id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.contactsService.update(+id, updateContactDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const user = { id: req.user.userId } as User;
    return this.contactsService.remove(+id, user);
  }
}
