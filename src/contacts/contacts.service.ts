
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
    const { assignedToId, ...contactData } = createContactDto;
    const contact = this.contactsRepository.create({
      ...contactData,
      user: assignedToId ? { id: assignedToId } as User : user,
    });
    return await this.contactsRepository.save(contact);
  }

  async findAll(user: User): Promise<Contact[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return await this.contactsRepository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    }
    return await this.contactsRepository.find({
      where: { user: { id: user.id } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Contact> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      const contact = await this.contactsRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }
      return contact;
    }
    const contact = await this.contactsRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['user'],
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(id: number, updateContactDto: UpdateContactDto, user: User): Promise<Contact> {
    const { assignedToId, ...contactData } = updateContactDto;
    const contact = await this.findOne(id, user);
    Object.assign(contact, contactData);
    if (assignedToId) {
      contact.user = { id: assignedToId } as User;
    }
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
