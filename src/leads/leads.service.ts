import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { Contact } from '../entities/contact.entity';
import { Revenue } from '../entities/revenue.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
  ) {}

  async create(createLeadDto: CreateLeadDto, user: User): Promise<Lead> {
    const { contactId, ...leadData } = createLeadDto;

    const lead = this.leadsRepository.create({
      ...leadData,
      assignedTo: user,
      status: leadData.status || LeadStatus.NEW,
    });

    if (contactId) {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId, user: { id: user.id } },
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
    return this.leadsRepository.find({
      where: { assignedTo: { id: user.id } },
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id, assignedTo: { id: user.id } },
      relations: ['contact'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async update(id: number, updateLeadDto: UpdateLeadDto, user: User): Promise<Lead> {
    const lead = await this.findOne(id, user);
    const previousStatus = lead.status;

    // Update fields
    Object.assign(lead, updateLeadDto);

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
