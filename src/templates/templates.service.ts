import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templatesRepository: Repository<EmailTemplate>,
  ) { }

  async findAll(): Promise<EmailTemplate[]> {
    return this.templatesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<EmailTemplate | null> {
    return this.templatesRepository.findOne({ where: { id } });
  }

  async create(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = this.templatesRepository.create(data);
    return this.templatesRepository.save(template);
  }

  async update(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    await this.templatesRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.templatesRepository.delete(id);
  }
}
