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

  async findAll(institutionId: number): Promise<EmailTemplate[]> {
    return this.templatesRepository.find({
      where: { institutionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, institutionId: number): Promise<EmailTemplate | null> {
    return this.templatesRepository.findOne({ where: { id, institutionId } });
  }

  async create(data: Partial<EmailTemplate>, institutionId: number): Promise<EmailTemplate> {
    const template = this.templatesRepository.create({
      ...data,
      institutionId,
    });
    return this.templatesRepository.save(template);
  }

  async update(id: number, data: Partial<EmailTemplate>, institutionId: number): Promise<EmailTemplate | null> {
    const existing = await this.findOne(id, institutionId);
    if (!existing) {
      return null;
    }
    await this.templatesRepository.update(id, data);
    return this.findOne(id, institutionId);
  }

  async remove(id: number, institutionId: number): Promise<void> {
    const existing = await this.findOne(id, institutionId);
    if (existing) {
      await this.templatesRepository.delete(id);
    }
  }
}
