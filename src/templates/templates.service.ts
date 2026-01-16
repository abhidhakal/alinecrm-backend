import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templatesRepository: Repository<EmailTemplate>,
  ) { }

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private async seedDefaultTemplates() {
    const defaultTemplates: Partial<EmailTemplate>[] = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to our platform!',
        description: 'A warm welcome for new subscribers.',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #333;">Welcome aboard!</h1>
            <p>Hi there,</p>
            <p>We're thrilled to have you with us. Explore our services and let us know if you have any questions.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="#" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started</a>
            </div>
            <p style="margin-top: 40px; font-size: 12px; color: #777;">Best regards,<br>The Team</p>
          </div>
        `,
        institutionId: null,
      },
      {
        name: 'Newsletter Update',
        subject: 'Our Monthly Newsletter',
        description: 'Keep your audience updated with latest news.',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Monthly Highlights</h2>
            <p>Catch up on what's new this month. We have exciting updates to share!</p>
            <ul style="color: #555;">
              <li>Feature update: Better analytics</li>
              <li>New blog post: Productivity tips</li>
              <li>Community spotlight</li>
            </ul>
            <p>Read the full update on our blog.</p>
            <p style="margin-top: 40px; font-size: 12px; color: #777;">Cheers,<br>The Newsletter Team</p>
          </div>
        `,
        institutionId: null,
      },
      {
        name: 'Product Launch',
        subject: 'Introducing Our New Feature!',
        description: 'Announce new features or products.',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center;">
              <span style="font-size: 12px; color: #007bff; font-weight: bold; text-transform: uppercase;">New Release</span>
            </div>
            <h1 style="color: #333; text-align: center;">It's Finally Here!</h1>
            <p>We've been working hard on something special. Check out our latest feature designed to help you work smarter.</p>
            <div style="text-align: center; margin: 30px 0;">
              <img src="https://via.placeholder.com/500x300?text=New+Feature+Preview" alt="Feature Preview" style="width: 100%; border-radius: 10px;" />
            </div>
            <div style="text-align: center;">
              <a href="#" style="background-color: #007bff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Explore Now</a>
            </div>
          </div>
        `,
        institutionId: null,
      },
      {
        name: 'Feedback Request',
        subject: 'How are we doing?',
        description: 'Ask for feedback from your customers.',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <p>We value your opinion!</p>
            <p>Could you take a minute to tell us how you're finding our platform? Your feedback helps us improve.</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
              <p style="margin-bottom: 20px;">Rate your experience:</p>
              <a href="#" style="margin: 0 5px; text-decoration: none; font-size: 24px;">⭐</a>
              <a href="#" style="margin: 0 5px; text-decoration: none; font-size: 24px;">⭐</a>
              <a href="#" style="margin: 0 5px; text-decoration: none; font-size: 24px;">⭐</a>
              <a href="#" style="margin: 0 5px; text-decoration: none; font-size: 24px;">⭐</a>
              <a href="#" style="margin: 0 5px; text-decoration: none; font-size: 24px;">⭐</a>
            </div>
          </div>
        `,
        institutionId: null,
      },
      {
        name: 'Re-engagement',
        subject: 'We miss you!',
        description: 'Bring back inactive users.',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">We miss you at Aline CRM!</h2>
            <p>It's been a while since we've seen you. We've added lots of new features that we think you'll love.</p>
            <p>Come back and see what's new. We've even applied a special credit to your account for your next campaign!</p>
            <div style="margin: 30px 0; border: 2px dashed #eee; padding: 20px; text-align: center; border-radius: 10px;">
              <p style="font-size: 14px; margin-bottom: 5px;">Use Code:</p>
              <p style="font-size: 24px; font-weight: bold; color: #333;">WELCOMEBACK</p>
            </div>
            <div style="text-align: center;">
              <a href="#" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Return to Dashboard</a>
            </div>
          </div>
        `,
        institutionId: null,
      },
    ];

    for (const templateData of defaultTemplates) {
      const exists = await this.templatesRepository.findOne({
        where: { name: templateData.name, institutionId: IsNull() },
      });
      if (!exists) {
        const newTemplate = this.templatesRepository.create(templateData);
        await this.templatesRepository.save(newTemplate);
      }
    }
  }

  async findAll(institutionId: number): Promise<EmailTemplate[]> {
    return this.templatesRepository.find({
      where: [
        { institutionId },
        { institutionId: IsNull() }
      ],
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
