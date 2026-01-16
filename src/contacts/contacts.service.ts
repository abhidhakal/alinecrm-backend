import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { User } from '../entities/user.entity';
import { Role } from '../auth/role.enum';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationService: NotificationService,
  ) { }

  async create(createContactDto: CreateContactDto, user: any): Promise<Contact> {
    const { assignedToIds, ...contactData } = createContactDto;
    const userId = user.userId || user.id;
    const contact = this.contactsRepository.create({
      ...contactData,
      institutionId: user.institutionId, // Assign institution
      createdById: userId,
    });

    if (assignedToIds && assignedToIds.length > 0) {
      contact.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
    } else {
      contact.assignedTo = [user];
    }

    const savedContact = await this.contactsRepository.save(contact);

    // Notify Admins if created by a non-admin
    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      this.notificationService.notifyAdmins({
        title: 'New Contact Created',
        message: `${user.name} created a new contact: ${savedContact.name}`,
        link: `/contacts/${savedContact.id}`,
        type: 'contact',
        action: 'creation',
      }).catch(err => console.error('Failed to send notification:', err));
    }

    return savedContact;
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

  async findAll(user: any): Promise<Contact[]> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return await this.contactsRepository.find({
        where: { institutionId: user.institutionId }, // Restrict to institution
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
      });
    }
    return await this.contactsRepository.find({
      where: {
        assignedTo: { id: userId },
        institutionId: user.institutionId // Restrict to institution (redundant but safe)
      },
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: any): Promise<Contact> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    const where: any = { id, institutionId: user.institutionId };

    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      where.assignedTo = { id: userId };
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

  async update(id: number, updateContactDto: UpdateContactDto, user: any): Promise<Contact> {
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

  async remove(id: number, user: any): Promise<void> {
    const contact = await this.findOne(id, user); // findOne already checks access
    await this.contactsRepository.remove(contact);
  }

  async bulkRemove(ids: number[], user: any): Promise<void> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    const where: any = { id: In(ids), institutionId: user.institutionId };

    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      where.assignedTo = { id: userId };
    }

    const contacts = await this.contactsRepository.find({
      where,
      relations: ['assignedTo'],
    });

    await this.contactsRepository.remove(contacts);
  }
}
