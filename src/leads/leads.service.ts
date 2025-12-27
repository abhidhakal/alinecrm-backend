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
  ) { }

  async create(createLeadDto: CreateLeadDto, user: User): Promise<Lead> {
    const { contactId, assignedToIds, ...leadData } = createLeadDto;

    const lead = this.leadsRepository.create({
      ...leadData,
      status: leadData.status || LeadStatus.NEW,
    });

    if (assignedToIds && assignedToIds.length > 0) {
      lead.assignedTo = await this.usersRepository.findBy({ id: In(assignedToIds) });
    } else {
      lead.assignedTo = [user];
    }

    if (contactId) {
      const whereClause: any = { id: contactId };
      if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
        whereClause.assignedTo = { id: user.id };
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

    return this.leadsRepository.save(lead);
  }

  async findAll(user: User): Promise<Lead[]> {
    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.leadsRepository.find({
        relations: ['contact', 'assignedTo'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.leadsRepository.find({
      where: { assignedTo: { id: user.id } },
      relations: ['contact', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Lead> {
    const whereClause: any = { id };
    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      whereClause.assignedTo = { id: user.id };
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

  async update(id: number, updateLeadDto: UpdateLeadDto, user: User): Promise<Lead> {
    const { assignedToIds, ...updateData } = updateLeadDto;
    const lead = await this.findOne(id, user);
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
        });
        await this.revenueRepository.save(revenue);
      }
    }

    return this.leadsRepository.save(lead);
  }

  async remove(id: number, user: User): Promise<void> {
    const lead = await this.findOne(id, user);
    await this.leadsRepository.remove(lead);
  }
}
