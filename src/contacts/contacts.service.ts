import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createContactDto: CreateContactDto, user: User): Promise<Contact> {
    const { assignedToIds, ...contactData } = createContactDto;
    const contact = this.contactsRepository.create(contactData);

    if (assignedToIds && assignedToIds.length > 0) {
      contact.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
    } else {
      contact.assignedTo = [user];
    }

    return await this.contactsRepository.save(contact);
  }

  async bulkCreate(createContactDtos: CreateContactDto[], user: User): Promise<Contact[]> {
    const contacts: Contact[] = [];

    for (const dto of createContactDtos) {
      const { assignedToIds, ...contactData } = dto;
      const contact = this.contactsRepository.create(contactData);

      if (assignedToIds && assignedToIds.length > 0) {
        contact.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
      } else {
        contact.assignedTo = [user];
      }
      contacts.push(contact);
    }

    return await this.contactsRepository.save(contacts);
  }

  async findAll(user: User): Promise<Contact[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return await this.contactsRepository.find({
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
      });
    }
    return await this.contactsRepository.find({
      where: { assignedTo: { id: user.id } },
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Contact> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      const contact = await this.contactsRepository.findOne({
        where: { id },
        relations: ['assignedTo'],
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }
      return contact;
    }
    const contact = await this.contactsRepository.findOne({
      where: { id, assignedTo: { id: user.id } },
      relations: ['assignedTo'],
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(id: number, updateContactDto: UpdateContactDto, user: User): Promise<Contact> {
    const { assignedToIds, ...contactData } = updateContactDto;
    const contact = await this.findOne(id, user);
    Object.assign(contact, contactData);

    if (assignedToIds !== undefined) {
      if (assignedToIds.length > 0) {
        contact.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
      } else {
        contact.assignedTo = [];
      }
    }

    return await this.contactsRepository.save(contact);
  }

  async remove(id: number, user: User): Promise<void> {
    const contact = await this.findOne(id, user);
    await this.contactsRepository.remove(contact);
  }

  async bulkRemove(ids: number[], user: User): Promise<void> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      const contacts = await this.contactsRepository.findBy({ id: In(ids) });
      await this.contactsRepository.remove(contacts);
    } else {
      const contacts = await this.contactsRepository.find({
        where: { id: In(ids), assignedTo: { id: user.id } },
        relations: ['assignedTo'],
      });
      await this.contactsRepository.remove(contacts);
    }
  }
}
