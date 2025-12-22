
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { User } from '../entities/user.entity';
import { Role } from '../auth/role.enum';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
  ) { }

  async create(createContactDto: CreateContactDto, user: User): Promise<Contact> {
    const contact = this.contactsRepository.create({
      ...createContactDto,
      user,
    });
    return await this.contactsRepository.save(contact);
  }

  async findAll(user: User): Promise<Contact[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return await this.contactsRepository.find({
        order: { createdAt: 'DESC' },
      });
    }
    return await this.contactsRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Contact> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      const contact = await this.contactsRepository.findOne({
        where: { id },
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }
      return contact;
    }
    const contact = await this.contactsRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(id: number, updateContactDto: UpdateContactDto, user: User): Promise<Contact> {
    const contact = await this.findOne(id, user);
    Object.assign(contact, updateContactDto);
    return await this.contactsRepository.save(contact);
  }

  async remove(id: number, user: User): Promise<void> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      const result = await this.contactsRepository.delete({ id });
      if (result.affected === 0) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }
      return;
    }
    const result = await this.contactsRepository.delete({ id, user: { id: user.id } });
    if (result.affected === 0) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }
}
