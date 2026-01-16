import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { Contact } from '../entities/contact.entity';
import { Revenue } from '../entities/revenue.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { User } from '../entities/user.entity';
import { Role } from '../auth/role.enum';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationService: NotificationService,
  ) { }

  async create(createLeadDto: CreateLeadDto, user: any): Promise<Lead> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    const { contactId, assignedToIds, ...leadData } = createLeadDto;

    const lead = this.leadsRepository.create({
      ...leadData,
      status: leadData.status || LeadStatus.NEW,
      institutionId: user.institutionId, // Assign institution
      createdById: userId,
    });

    if (assignedToIds && assignedToIds.length > 0) {
      lead.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
    } else {
      lead.assignedTo = [user];
    }

    if (contactId) {
      const whereClause: any = { id: contactId, institutionId: user.institutionId }; // Verify contact belongs to institution
      if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
        whereClause.assignedTo = { id: userId };
      }
      const contact = await this.contactsRepository.findOne({
        where: whereClause,
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${contactId} not found`);
      }
      lead.contact = contact;

      // Auto-fill details from contact if not provided
      if (!lead.name) lead.name = contact.name;
      if (!lead.email) lead.email = contact.email;
      if (!lead.phone) lead.phone = contact.phone;
      if (!lead.companyName) lead.companyName = contact.companyName;
    }

    const savedLead = await this.leadsRepository.save(lead);

    // Notify Admins if created by a non-admin
    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      this.notificationService.notifyAdmins({
        title: 'New Lead Created',
        message: `${user.name} created a new lead: ${savedLead.name}`,
        link: `/leads/${savedLead.id}`,
        type: 'lead',
        action: 'creation',
      }).catch(err => console.error('Failed to send notification:', err));
    }

    return savedLead;
  }

  async findAll(user: any): Promise<Lead[]> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.leadsRepository.find({
        where: { institutionId: user.institutionId }, // Restrict to institution
        relations: ['contact', 'assignedTo'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.leadsRepository.find({
      where: {
        assignedTo: { id: userId },
        institutionId: user.institutionId
      },
      relations: ['contact', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: any): Promise<Lead> {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    const whereClause: any = { id, institutionId: user.institutionId };
    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      whereClause.assignedTo = { id: userId };
    }
    const lead = await this.leadsRepository.findOne({
      where: whereClause,
      relations: ['contact', 'assignedTo'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async update(id: number, updateLeadDto: UpdateLeadDto, user: any): Promise<Lead> {
    const { assignedToIds, ...updateData } = updateLeadDto;
    const userId = user.userId || user.id;
    const lead = await this.findOne(id, user); // findOne checks access
    const previousStatus = lead.status;

    // Update fields
    Object.assign(lead, updateData);

    if (assignedToIds !== undefined) {
      if (assignedToIds.length > 0) {
        lead.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
      } else {
        lead.assignedTo = [];
      }
    }

    // Check for status change to CLOSED_WON
    if (
      previousStatus !== LeadStatus.CLOSED_WON &&
      lead.status === LeadStatus.CLOSED_WON
    ) {
      // Create Revenue entry
      const revenueAmount = lead.potentialValue || 0;
      if (revenueAmount > 0) {
        const revenue = this.revenueRepository.create({
          amount: revenueAmount,
          description: `Revenue from closed lead: ${lead.name}`,
          user: user,
          lead: lead,
          institutionId: user.institutionId, // Assign institution to revenue
        });
        await this.revenueRepository.save(revenue);
      }
    }

    return this.leadsRepository.save(lead);
  }

  async remove(id: number, user: any): Promise<void> {
    const userId = user.userId || user.id;
    const lead = await this.findOne(id, user); // findOne checks access
    await this.leadsRepository.remove(lead);
  }
}
