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

  async getStats(user: any) {
    // JWT payload has 'userId' not 'id' - extract it correctly
    const userId = user.userId || user.id;

    const today = new Date();
    // Format today as YYYY-MM-DD for strict date matching on 'date' column
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const institutionId = user.institutionId;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    // Base where clause for institution-wide queries
    const baseWhere = { institutionId };

    // User-specific where clause (for employee stats)
    const userWhere = isAdmin ? baseWhere : {
      institutionId,
      assignedTo: { id: userId }
    };

    // 1. New Leads (user-specific for employees, global for admins)
    const newLeadsQuery: any = {
      ...userWhere,
      createdAt: MoreThanOrEqual(thirtyDaysAgo),
    };
    // For user-specific, we need to use relations - use find instead of count
    let newLeadsCount: number;
    let previousNewLeadsCount: number;

    if (isAdmin) {
      newLeadsCount = await this.leadRepository.count({
        where: { ...baseWhere, createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      });
      previousNewLeadsCount = await this.leadRepository.count({
        where: { ...baseWhere, createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) },
      });
    } else {
      // For employees, count leads assigned to them
      const myRecentLeads = await this.leadRepository.find({
        where: { institutionId, createdAt: MoreThanOrEqual(thirtyDaysAgo) },
        relations: ['assignedTo'],
      });
      newLeadsCount = myRecentLeads.filter(l => l.assignedTo?.some(u => u.id === userId)).length;

      const myPreviousLeads = await this.leadRepository.find({
        where: { institutionId, createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) },
        relations: ['assignedTo'],
      });
      previousNewLeadsCount = myPreviousLeads.filter(l => l.assignedTo?.some(u => u.id === userId)).length;
    }

    const leadsGrowth = previousNewLeadsCount === 0
      ? (newLeadsCount > 0 ? 100 : 0)
      : Math.round(((newLeadsCount - previousNewLeadsCount) / previousNewLeadsCount) * 100);

    // 2. Conversion Rate (user-specific for employees, global for admins)
    let wonLeads: number;
    let lostLeads: number;

    if (isAdmin) {
      wonLeads = await this.leadRepository.count({
        where: { ...baseWhere, status: LeadStatus.CLOSED_WON },
      });
      lostLeads = await this.leadRepository.count({
        where: { ...baseWhere, status: LeadStatus.CLOSED_LOST },
      });
    } else {
      const allMyLeads = await this.leadRepository.find({
        where: { institutionId },
        relations: ['assignedTo'],
      });
      const myLeadsFiltered = allMyLeads.filter(l => l.assignedTo?.some(u => u.id === userId));
      wonLeads = myLeadsFiltered.filter(l => l.status === LeadStatus.CLOSED_WON).length;
      lostLeads = myLeadsFiltered.filter(l => l.status === LeadStatus.CLOSED_LOST).length;
    }

    const totalClosed = wonLeads + lostLeads;
    const conversionRate = totalClosed === 0 ? 0 : Math.round((wonLeads / totalClosed) * 100);

    // 3. Total Pipeline (user-specific for employees, global for admins)
    let totalPipeline: number;

    if (isAdmin) {
      const activeLeads = await this.leadRepository.find({
        where: { ...baseWhere },
        select: ['potentialValue', 'status']
      });
      totalPipeline = activeLeads
        .filter(l => l.status !== LeadStatus.CLOSED_WON && l.status !== LeadStatus.CLOSED_LOST)
        .reduce((sum, lead) => sum + Number(lead.potentialValue || 0), 0);
    } else {
      const allMyLeadsForPipeline = await this.leadRepository.find({
        where: { institutionId },
        relations: ['assignedTo'],
        select: ['id', 'potentialValue', 'status']
      });
      const myPipelineLeads = allMyLeadsForPipeline.filter(l =>
        l.assignedTo?.some(u => u.id === userId) &&
        l.status !== LeadStatus.CLOSED_WON &&
        l.status !== LeadStatus.CLOSED_LOST
      );
      totalPipeline = myPipelineLeads.reduce((sum, lead) => sum + Number(lead.potentialValue || 0), 0);
    }

    // 4. Leads Breakdown (Personal - always user-specific)
    const myLeads = await this.leadRepository.find({
      where: { institutionId },
      relations: ['assignedTo'],
    });
    const myLeadsFiltered = isAdmin ? myLeads : myLeads.filter(l => l.assignedTo?.some(u => u.id === userId));

    const leadsBreakdown = {
      Qualified: myLeadsFiltered.filter(l => l.status === LeadStatus.QUALIFIED).length,
      Proposed: myLeadsFiltered.filter(l => l.status === LeadStatus.PROPOSAL).length,
      Closed: myLeadsFiltered.filter(l => l.status === LeadStatus.CLOSED_WON || l.status === LeadStatus.CLOSED_LOST).length,
    };

    // 5. Win Rate (user-specific for employees, global for admins)
    const myWon = isAdmin ? wonLeads : myLeadsFiltered.filter(l => l.status === LeadStatus.CLOSED_WON).length;
    const myLost = isAdmin ? lostLeads : myLeadsFiltered.filter(l => l.status === LeadStatus.CLOSED_LOST).length;
    const myTotalClosed = myWon + myLost;
    const winRate = myTotalClosed === 0 ? 0 : Math.round((myWon / myTotalClosed) * 100);

    // 6. Revenue Chart Data
    const revenueLeads = await this.leadRepository.find({
      where: {
        institutionId,
        status: LeadStatus.CLOSED_WON
      },
      relations: ['assignedTo'],
      order: { updatedAt: 'ASC' },
      take: 200 // Increase limit for aggregation
    });

    const revenueLeadsFiltered = isAdmin
      ? revenueLeads
      : revenueLeads.filter(l => l.assignedTo?.some(u => u.id === userId));

    // Aggregate by date (YYYY-MM-DD)
    const aggregatedRevenue = revenueLeadsFiltered.reduce((acc, lead) => {
      const dateStr = lead.updatedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const val = Number(lead.potentialValue || 0);

      if (!acc[dateStr]) {
        acc[dateStr] = {
          amount: 0,
          date: lead.updatedAt, // Keep a Date object for sorting/mapping
          id: lead.id // Use lead ID as a mock ID for the entry
        };
      }
      acc[dateStr].amount += val;
      return acc;
    }, {} as Record<string, { amount: number, date: Date, id: number }>);

    const revenueData = Object.values(aggregatedRevenue)
      .map((entry, index) => ({
        id: entry.id, // Using one of the lead IDs, or could be random
        amount: entry.amount,
        description: `Daily revenue`,
        createdAt: entry.date,
        leadId: null, // Aggregated, so no single lead ID
        institutionId
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 7. Recent Items (user-specific for employees, global for admins)
    let recentLeads: Lead[];
    let recentContacts: Contact[];

    if (isAdmin) {
      recentLeads = await this.leadRepository.find({
        where: { ...baseWhere },
        order: { createdAt: 'DESC' },
        take: 5
      });
      recentContacts = await this.contactRepository.find({
        where: { ...baseWhere },
        order: { createdAt: 'DESC' },
        take: 5
      });
    } else {
      // For employees, get leads/contacts assigned to them
      const allRecentLeads = await this.leadRepository.find({
        where: { institutionId },
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
        take: 20
      });
      recentLeads = allRecentLeads.filter(l => l.assignedTo?.some(u => u.id === userId)).slice(0, 5);

      const allRecentContacts = await this.contactRepository.find({
        where: { institutionId },
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
        take: 20
      });
      recentContacts = allRecentContacts.filter(c => c.assignedTo?.some(u => u.id === userId)).slice(0, 5);
    }

    const recentCampaigns = await this.campaignRepository.find({
      where: { ...baseWhere },
      order: { createdAt: 'DESC' },
      take: 3
    });

    // 8. Tasks (Calendar + List) - user-specific for employees, global for admins
    let tasksDue: Task[];
    let calendarEvents: Task[];

    if (isAdmin) {
      // Get all incomplete tasks for the tasksDue section
      tasksDue = await this.taskRepository.find({
        where: {
          institutionId,
          status: Not(TaskStatus.COMPLETE),
        },
        order: { dueDate: 'ASC' },
        take: 5
      });

      // Get all incomplete tasks for calendar (frontend will filter by date)
      calendarEvents = await this.taskRepository.find({
        where: {
          institutionId,
          status: Not(TaskStatus.COMPLETE),
        },
        order: { dueDate: 'ASC' },
        take: 50
      });
    } else {
      // For employees, get only tasks assigned to them
      const allTasksDue = await this.taskRepository.find({
        where: {
          institutionId,
          status: Not(TaskStatus.COMPLETE),
        },
        relations: ['assignedTo'],
        order: { dueDate: 'ASC' },
        take: 50
      });
      tasksDue = allTasksDue.filter(t => t.assignedTo?.some(u => u.id === userId)).slice(0, 5);

      // Get all incomplete tasks for calendar (frontend will filter by date)
      const allCalendarEvents = await this.taskRepository.find({
        where: {
          institutionId,
          status: Not(TaskStatus.COMPLETE),
        },
        relations: ['assignedTo'],
        order: { dueDate: 'ASC' },
        take: 100
      });
      calendarEvents = allCalendarEvents.filter(t => t.assignedTo?.some(u => u.id === userId)).slice(0, 50);
    }

    const result = {
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

    return result;
  }
}
