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
    const contact = this.contactsRepository.create({
      ...contactData,
      institutionId: user.institutionId, // Assign institution
    });

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
      const contact = this.contactsRepository.create({
        ...contactData,
        institutionId: user.institutionId, // Assign institution
      });

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
        where: { institutionId: user.institutionId }, // Restrict to institution
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
      });
    }
    return await this.contactsRepository.find({
      where: {
        assignedTo: { id: user.id },
        institutionId: user.institutionId // Restrict to institution (redundant but safe)
      },
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Contact> {
    const where: any = { id, institutionId: user.institutionId };

    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      where.assignedTo = { id: user.id };
    }

    const contact = await this.contactsRepository.findOne({
      where,
      relations: ['assignedTo'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(id: number, updateContactDto: UpdateContactDto, user: User): Promise<Contact> {
    const { assignedToIds, ...contactData } = updateContactDto;
    const contact = await this.findOne(id, user); // findOne already checks access
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
    const contact = await this.findOne(id, user); // findOne already checks access
    await this.contactsRepository.remove(contact);
  }

  async bulkRemove(ids: number[], user: User): Promise<void> {
    const where: any = { id: In(ids), institutionId: user.institutionId };

    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      where.assignedTo = { id: user.id };
    }

    const contacts = await this.contactsRepository.find({
      where,
      relations: ['assignedTo'],
    });

    await this.contactsRepository.remove(contacts);
  }
}
