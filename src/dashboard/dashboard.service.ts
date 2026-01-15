import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { Revenue } from '../entities/revenue.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { Contact } from '../entities/contact.entity';
import { Campaign } from '../entities/campaign.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) { }

  async getStats(user: User) {
    const today = new Date();
    // Format today as YYYY-MM-DD for strict date matching on 'date' column
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const institutionId = user.institutionId;
    const baseWhere = { institutionId };

    // 1. New Leads
    const newLeadsCount = await this.leadRepository.count({
      where: {
        ...baseWhere,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const previousNewLeadsCount = await this.leadRepository.count({
      where: {
        ...baseWhere,
        createdAt: Between(sixtyDaysAgo, thirtyDaysAgo),
      },
    });

    const leadsGrowth = previousNewLeadsCount === 0
      ? (newLeadsCount > 0 ? 100 : 0)
      : Math.round(((newLeadsCount - previousNewLeadsCount) / previousNewLeadsCount) * 100);

    // 2. Conversion Rate
    const wonLeads = await this.leadRepository.count({
      where: { ...baseWhere, status: LeadStatus.CLOSED_WON },
    });
    const lostLeads = await this.leadRepository.count({
      where: { ...baseWhere, status: LeadStatus.CLOSED_LOST },
    });
    const totalClosed = wonLeads + lostLeads;
    const conversionRate = totalClosed === 0 ? 0 : Math.round((wonLeads / totalClosed) * 100);

    // 3. Total Pipeline
    const activeLeads = await this.leadRepository.find({
      where: { ...baseWhere },
      select: ['potentialValue', 'status']
    });
    const totalPipeline = activeLeads
      .filter(l => l.status !== LeadStatus.CLOSED_WON && l.status !== LeadStatus.CLOSED_LOST)
      .reduce((sum, lead) => sum + (lead.potentialValue || 0), 0);

    // 4. Your Leads (Personal)
    const myLeads = await this.leadRepository.find({
      where: {
        institutionId,
        assignedTo: { id: user.id }
      }
    });
    const leadsBreakdown = {
      Qualified: myLeads.filter(l => l.status === LeadStatus.QUALIFIED).length,
      Proposed: myLeads.filter(l => l.status === LeadStatus.PROPOSAL).length,
      Closed: myLeads.filter(l => l.status === LeadStatus.CLOSED_WON || l.status === LeadStatus.CLOSED_LOST).length,
    };

    // 5. Win Rate (Personal)
    const myWon = myLeads.filter(l => l.status === LeadStatus.CLOSED_WON).length;
    const myLost = myLeads.filter(l => l.status === LeadStatus.CLOSED_LOST).length;
    const myTotalClosed = myWon + myLost;
    const winRate = myTotalClosed === 0 ? 0 : Math.round((myWon / myTotalClosed) * 100);

    // 6. Revenue Chart Data
    const revenueData = await this.revenueRepository.find({
      where: { institutionId },
      order: { createdAt: 'ASC' },
      take: 50
    });

    // 7. Recent Items
    const recentLeads = await this.leadRepository.find({
      where: { ...baseWhere },
      order: { createdAt: 'DESC' },
      take: 5
    });

    const recentContacts = await this.contactRepository.find({
      where: { ...baseWhere },
      order: { createdAt: 'DESC' },
      take: 5
    });

    const recentCampaigns = await this.campaignRepository.find({
      where: { ...baseWhere },
      order: { createdAt: 'DESC' },
      take: 3
    });

    // 8. Tasks (Calendar + List)
    const baseTaskWhere = {
      institutionId,
      assignedTo: { id: user.id }
    };

    const tasksDue = await this.taskRepository.find({
      where: {
        ...baseTaskWhere,
        status: Not(TaskStatus.COMPLETE),
      },
      order: { dueDate: 'ASC' },
      take: 5
    });

    // For calendar: only show today's tasks as per user request
    const calendarEvents = await this.taskRepository.find({
      where: {
        ...baseTaskWhere,
        dueDate: todayStr,
        status: Not(TaskStatus.COMPLETE),
      } as any,
      order: { dueDate: 'ASC' },
      take: 20
    });

    return {
      stats: {
        newLeads: { count: newLeadsCount, growth: leadsGrowth },
        conversionRate: { value: conversionRate, growth: 0 },
        totalPipeline: { value: totalPipeline, growth: 0 },
      },
      leadsBreakdown,
      winRate: { value: winRate, won: myWon, lost: myLost },
      revenueData,
      recent: {
        leads: recentLeads,
        contacts: recentContacts,
        campaigns: recentCampaigns,
      },
      tasks: {
        due: tasksDue,
        calendar: calendarEvents
      }
    };
  }
}
