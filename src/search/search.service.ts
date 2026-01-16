import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Lead } from '../entities/lead.entity';
import { Contact } from '../entities/contact.entity';
import { Task } from '../entities/task.entity';
import { Campaign } from '../entities/campaign.entity';
import { User } from '../entities/user.entity';

export interface SearchResult {
  id: number;
  type: 'lead' | 'contact' | 'task' | 'campaign';
  title: string;
  subtitle: string;
  link: string;
  status?: string;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Lead) private leadRepository: Repository<Lead>,
    @InjectRepository(Contact) private contactRepository: Repository<Contact>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(Campaign) private campaignRepository: Repository<Campaign>,
  ) { }

  async globalSearch(query: string, user: any): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const institutionId = user.institutionId;
    const searchTerm = `%${query}%`;
    const results: SearchResult[] = [];

    // 1. Leads (name, companyName, email)
    const leads = await this.leadRepository.find({
      where: [
        { institutionId, name: ILike(searchTerm) },
        { institutionId, companyName: ILike(searchTerm) },
        { institutionId, email: ILike(searchTerm) },
      ],
      take: 5,
      order: { createdAt: 'DESC' }
    });

    results.push(...leads.map(l => ({
      id: l.id,
      type: 'lead' as const,
      title: l.name || 'Unnamed Lead',
      subtitle: l.companyName ? `${l.companyName} • ${l.email}` : (l.email || 'No email'),
      link: user.role === 'admin' || user.role === 'superadmin' ? `/admin/leads/${l.id}` : `/leads/${l.id}`,
      status: l.status
    })));

    // 2. Contacts (name, companyName, email)
    const contacts = await this.contactRepository.find({
      where: [
        { institutionId, name: ILike(searchTerm) },
        { institutionId, email: ILike(searchTerm) },
        { institutionId, phone: ILike(searchTerm) },
        { institutionId, companyName: ILike(searchTerm) },
      ],
      take: 5,
      order: { createdAt: 'DESC' }
    });

    results.push(...contacts.map(c => ({
      id: c.id,
      type: 'contact' as const,
      title: c.name,
      subtitle: c.companyName ? `${c.companyName} • ${c.email}` : c.email,
      link: user.role === 'admin' || user.role === 'superadmin' ? `/admin/contacts/${c.id}` : `/contacts/${c.id}`,
      status: 'Active'
    })));

    // 3. Tasks (title, description)
    const tasks = await this.taskRepository.find({
      where: [
        { institutionId, title: ILike(searchTerm) },
        { institutionId, description: ILike(searchTerm) },
      ],
      take: 5,
      order: { createdAt: 'DESC' }
    });

    results.push(...tasks.map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      subtitle: t.description ? t.description.substring(0, 50) : 'No description',
      link: user.role === 'admin' || user.role === 'superadmin' ? `/admin/tasks` : `/tasks`,
      status: t.status
    })));

    // 4. Campaigns (title, content) - Entity uses title/content, NOT name/subject
    const campaigns = await this.campaignRepository.find({
      where: [
        { institutionId, title: ILike(searchTerm) },
        { institutionId, content: ILike(searchTerm) },
      ],
      take: 5,
      order: { createdAt: 'DESC' }
    });

    results.push(...campaigns.map(c => ({
      id: c.id,
      type: 'campaign' as const,
      title: c.title,
      subtitle: c.content ? c.content.substring(0, 50) : 'No content',
      link: user.role === 'admin' || user.role === 'superadmin' ? `/admin/campaigns/${c.id}` : `/campaigns/${c.id}`,
      status: 'Active' // Campaigns don't have a status field in the entity shown
    })));

    return results;
  }
}
