import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  EmailCampaign,
  CampaignStatus,
  AudienceSource,
  AudienceFilter,
} from '../entities/email-campaign.entity';
import {
  EmailCampaignRecipient,
  RecipientStatus,
} from '../entities/email-campaign-recipient.entity';
import { EmailEvent, EmailEventType } from '../entities/email-event.entity';
import { UnsubscribedEmail } from '../entities/unsubscribed-email.entity';
import { Contact } from '../entities/contact.entity';
import { Lead } from '../entities/lead.entity';
import { User } from '../entities/user.entity';
import { CreateCampaignDto, UpdateCampaignDto, SendCampaignDto } from './dto';
import { BrevoProvider } from './providers/brevo.provider';
import { SendEmailOptions } from './providers/email-provider.interface';

interface RecipientData {
  email: string;
  name: string;
  contactId?: number;
  leadId?: number;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,

    @InjectRepository(EmailCampaignRecipient)
    private recipientRepository: Repository<EmailCampaignRecipient>,

    @InjectRepository(EmailEvent)
    private eventRepository: Repository<EmailEvent>,

    @InjectRepository(UnsubscribedEmail)
    private unsubscribedRepository: Repository<UnsubscribedEmail>,

    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,

    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,

    private brevoProvider: BrevoProvider,
    private configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  // ============================================
  // CAMPAIGN CRUD OPERATIONS
  // ============================================

  async create(createCampaignDto: CreateCampaignDto, user: User): Promise<EmailCampaign> {
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      scheduledAt: createCampaignDto.scheduledAt
        ? new Date(createCampaignDto.scheduledAt)
        : null,
      createdById: user.id,
      status: CampaignStatus.DRAFT,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Calculate estimated recipients
    const estimatedCount = await this.estimateRecipientCount(
      savedCampaign.audienceFilters,
    );
    savedCampaign.totalRecipients = estimatedCount;
    await this.campaignRepository.save(savedCampaign);

    return savedCampaign;
  }

  async findAll(user: User): Promise<EmailCampaign[]> {
    return this.campaignRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async findOne(id: number): Promise<EmailCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(
    id: number,
    updateCampaignDto: UpdateCampaignDto,
    user: User,
  ): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    // Can't update campaigns that are sending or sent
    if (
      campaign.status === CampaignStatus.SENDING ||
      campaign.status === CampaignStatus.SENT
    ) {
      throw new BadRequestException('Cannot update a campaign that is sending or already sent');
    }

    Object.assign(campaign, {
      ...updateCampaignDto,
      scheduledAt: updateCampaignDto.scheduledAt
        ? new Date(updateCampaignDto.scheduledAt)
        : campaign.scheduledAt,
    });

    // Recalculate recipients if audience changed
    if (updateCampaignDto.audienceFilters) {
      const estimatedCount = await this.estimateRecipientCount(
        campaign.audienceFilters,
      );
      campaign.totalRecipients = estimatedCount;
    }

    return this.campaignRepository.save(campaign);
  }

  async remove(id: number, user: User): Promise<void> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot delete a campaign that is currently sending');
    }

    await this.campaignRepository.remove(campaign);
  }

  async duplicate(id: number, user: User): Promise<EmailCampaign> {
    const original = await this.findOne(id);

    const duplicate = this.campaignRepository.create({
      name: `${original.name} (Copy)`,
      subject: original.subject,
      previewText: original.previewText,
      senderName: original.senderName,
      senderEmail: original.senderEmail,
      htmlContent: original.htmlContent,
      provider: original.provider,
      audienceFilters: original.audienceFilters,
      createdById: user.id,
      status: CampaignStatus.DRAFT,
    });

    const saved = await this.campaignRepository.save(duplicate);
    saved.totalRecipients = original.totalRecipients;
    return this.campaignRepository.save(saved);
  }

  // ============================================
  // AUDIENCE RESOLUTION
  // ============================================

  async estimateRecipientCount(audienceFilters: AudienceFilter): Promise<number> {
    const recipients = await this.resolveAudience(audienceFilters);
    return recipients.length;
  }

  async resolveAudience(audienceFilters: AudienceFilter): Promise<RecipientData[]> {
    const { source, filters } = audienceFilters;

    // Get unsubscribed emails to exclude
    const unsubscribedEmails = await this.getUnsubscribedEmails();

    let recipients: RecipientData[] = [];

    if (source === AudienceSource.CONTACTS) {
      recipients = await this.resolveContactsAudience(filters);
    } else if (source === AudienceSource.LEADS) {
      recipients = await this.resolveLeadsAudience(filters);
    }

    // Filter out unsubscribed emails
    recipients = recipients.filter(
      (r) => !unsubscribedEmails.has(r.email.toLowerCase()),
    );

    // Remove duplicates by email
    const emailMap = new Map<string, RecipientData>();
    for (const recipient of recipients) {
      const lowerEmail = recipient.email.toLowerCase();
      if (!emailMap.has(lowerEmail)) {
        emailMap.set(lowerEmail, recipient);
      }
    }

    return Array.from(emailMap.values());
  }

  private async resolveContactsAudience(
    filters: AudienceFilter['filters'],
  ): Promise<RecipientData[]> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.email IS NOT NULL')
      .andWhere("contact.email != ''");

    // Apply priority filter
    if (filters.priority && filters.priority.length > 0) {
      queryBuilder.andWhere('contact.priority IN (:...priorities)', {
        priorities: filters.priority,
      });
    }

    // Apply date range filters
    if (filters.createdAtFrom) {
      queryBuilder.andWhere('contact.createdAt >= :fromDate', {
        fromDate: new Date(filters.createdAtFrom),
      });
    }

    if (filters.createdAtTo) {
      queryBuilder.andWhere('contact.createdAt <= :toDate', {
        toDate: new Date(filters.createdAtTo),
      });
    }

    const contacts = await queryBuilder.getMany();

    return contacts.map((c) => ({
      email: c.email,
      name: c.name,
      contactId: c.id,
    }));
  }

  private async resolveLeadsAudience(
    filters: AudienceFilter['filters'],
  ): Promise<RecipientData[]> {
    const queryBuilder = this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.email IS NOT NULL')
      .andWhere("lead.email != ''");

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('lead.status IN (:...statuses)', {
        statuses: filters.status,
      });
    }

    // Apply source filter
    if (filters.leadSource && filters.leadSource.length > 0) {
      queryBuilder.andWhere('lead.source IN (:...sources)', {
        sources: filters.leadSource,
      });
    }

    // Apply date range filters
    if (filters.createdAtFrom) {
      queryBuilder.andWhere('lead.createdAt >= :fromDate', {
        fromDate: new Date(filters.createdAtFrom),
      });
    }

    if (filters.createdAtTo) {
      queryBuilder.andWhere('lead.createdAt <= :toDate', {
        toDate: new Date(filters.createdAtTo),
      });
    }

    const leads = await queryBuilder.getMany();

    return leads.map((l) => ({
      email: l.email,
      name: l.name,
      leadId: l.id,
    }));
  }

  private async getUnsubscribedEmails(): Promise<Set<string>> {
    const unsubscribed = await this.unsubscribedRepository.find();
    return new Set(unsubscribed.map((u) => u.email.toLowerCase()));
  }

  // ============================================
  // CAMPAIGN SENDING
  // ============================================

  async sendCampaign(
    id: number,
    sendDto: SendCampaignDto,
    user: User,
  ): Promise<{ success: boolean; message: string; recipientCount: number }> {
    this.logger.log(`[DEBUG] sendCampaign initiated for Campaign ID: ${id}`);

    const campaign = await this.findOne(id);

    // Validate campaign can be sent
    if (campaign.status === CampaignStatus.SENDING) {
      this.logger.warn(`Campaign ${id} is already in SENDING status`);
      throw new BadRequestException('Campaign is already sending');
    }

    if (campaign.status === CampaignStatus.SENT) {
      this.logger.warn(`Campaign ${id} is already SENT`);
      throw new BadRequestException('Campaign has already been sent');
    }

    // Check for required fields
    if (!campaign.htmlContent || !campaign.subject) {
      this.logger.error(`Campaign ${id} missing content/subject`);
      throw new BadRequestException('Campaign must have subject and HTML content');
    }

    // Resolve audience dynamically
    this.logger.log(`[DEBUG] Resolving audience...`);
    const recipients = await this.resolveAudience(campaign.audienceFilters);
    this.logger.log(`[DEBUG] Resolved ${recipients.length} recipients`);

    if (recipients.length === 0) {
      this.logger.warn(`[DEBUG] No recipients found. Aborting send.`);
      throw new BadRequestException('No recipients match the audience filters');
    }

    // Update campaign status
    campaign.status = CampaignStatus.SENDING;
    campaign.totalRecipients = recipients.length;
    await this.campaignRepository.save(campaign);
    this.logger.log(`[DEBUG] Campaign status updated to SENDING`);

    // Create recipient records
    await this.createRecipientRecords(campaign.id, recipients);
    this.logger.log(`[DEBUG] Recipient records created`);

    // Start sending in background (don't await)
    this.processCampaignSending(campaign).catch((error) => {
      this.logger.error(`Failed to process campaign sending: ${error}`);
    });

    return {
      success: true,
      message: 'Campaign sending started',
      recipientCount: recipients.length,
    };
  }

  private async createRecipientRecords(
    campaignId: number,
    recipients: RecipientData[],
  ): Promise<void> {
    // Delete existing recipients for this campaign
    await this.recipientRepository.delete({ campaignId });

    // Create new records in batches
    const batchSize = 500;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const recipientEntities = batch.map((r) =>
        this.recipientRepository.create({
          campaignId,
          email: r.email,
          name: r.name,
          contactId: r.contactId || null,
          leadId: r.leadId || null,
          status: RecipientStatus.QUEUED,
        }),
      );
      await this.recipientRepository.save(recipientEntities);
    }
  }

  private async processCampaignSending(campaign: EmailCampaign): Promise<void> {
    this.logger.log(`[DEBUG] processCampaignSending started for ${campaign.id}`);
    const batchSize = this.brevoProvider.getBatchSize();
    const dailyLimit = this.brevoProvider.getDailyLimit();

    let sentToday = 0;
    let offset = 0;

    try {
      while (true) {
        // Check daily limit
        if (sentToday >= dailyLimit) {
          this.logger.warn(
            `Daily send limit reached for campaign ${campaign.id}. Pausing.`,
          );
          // In production, you'd schedule to continue tomorrow
          break;
        }

        // Get next batch of queued recipients
        const queuedRecipients = await this.recipientRepository.find({
          where: { campaignId: campaign.id, status: RecipientStatus.QUEUED },
          take: Math.min(batchSize, dailyLimit - sentToday),
        });

        if (queuedRecipients.length === 0) {
          this.logger.log(`[DEBUG] No more queued recipients. Finishing.`);
          break; // All done
        }

        this.logger.log(`[DEBUG] Processing batch of ${queuedRecipients.length} recipients`);

        // Prepare email batch
        const emailOptions: SendEmailOptions[] = queuedRecipients.map((r) => ({
          to: {
            email: r.email,
            name: r.name || undefined,
            contactId: r.contactId ?? undefined,
            leadId: r.leadId ?? undefined,
          },
          from: {
            email: campaign.senderEmail,
            name: campaign.senderName,
          },
          subject: campaign.subject,
          htmlContent: campaign.htmlContent,
          previewText: campaign.previewText || undefined,
          campaignId: campaign.id,
          unsubscribeUrl: this.generateUnsubscribeUrl(r.email, campaign.id),
        }));

        // Send batch
        this.logger.log(`[DEBUG] Sending batch to BrevoProvider...`);
        const results = await this.brevoProvider.sendBatch(emailOptions);
        this.logger.log(`[DEBUG] BrevoProvider returned ${results.length} results`);

        // Process results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const recipient = queuedRecipients[i];

          if (result.success) {
            this.logger.log(`[DEBUG] Email sent to ${recipient.email}. MsgID: ${result.messageId}`);
            recipient.status = RecipientStatus.SENT;
            recipient.providerMessageId = result.messageId || '';
            recipient.sentAt = new Date();
            campaign.sentCount++;
            sentToday++;
          } else {
            this.logger.error(`[DEBUG] Failed to send to ${recipient.email}: ${result.error}`);
            recipient.status = RecipientStatus.FAILED;
            recipient.errorMessage = result.error || 'Unknown error';
            campaign.failedCount++;
          }

          await this.recipientRepository.save(recipient);
        }

        // Update campaign progress
        await this.campaignRepository.save(campaign);

        // Small delay between batches
        await this.delay(1000);
      }

      // Check final status
      const queuedRemaining = await this.recipientRepository.count({
        where: { campaignId: campaign.id, status: RecipientStatus.QUEUED },
      });

      if (queuedRemaining === 0) {
        campaign.status = CampaignStatus.SENT;
      }

      await this.campaignRepository.save(campaign);

      this.logger.log(
        `Campaign ${campaign.id} sending completed. Sent: ${campaign.sentCount}, Failed: ${campaign.failedCount}`,
      );
    } catch (error) {
      this.logger.error(`Campaign ${campaign.id} sending failed: ${error}`);
      campaign.status = CampaignStatus.FAILED;
      await this.campaignRepository.save(campaign);
    }
  }

  private generateUnsubscribeUrl(email: string, campaignId: number): string {
    // Generate a simple base64 token (in production, use signed tokens)
    const payload = JSON.stringify({ email, campaignId, ts: Date.now() });
    const token = Buffer.from(payload).toString('base64url');
    return `${this.appUrl}/api/unsubscribe/${token}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(id: number): Promise<{
    campaign: EmailCampaign;
    stats: {
      totalRecipients: number;
      sent: number;
      failed: number;
      opened: number;
      clicked: number;
      bounced: number;
      unsubscribed: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
    };
    recentEvents: EmailEvent[];
  }> {
    const campaign = await this.findOne(id);

    // Get event counts
    const eventCounts = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.campaignId = :campaignId', { campaignId: id })
      .groupBy('event.eventType')
      .getRawMany();

    const countMap = new Map<string, number>();
    for (const ec of eventCounts) {
      countMap.set(ec.eventType, parseInt(ec.count, 10));
    }

    const opened = countMap.get(EmailEventType.OPEN) || 0;
    const clicked = countMap.get(EmailEventType.CLICK) || 0;
    const bounced =
      (countMap.get(EmailEventType.BOUNCE) || 0) +
      (countMap.get(EmailEventType.HARD_BOUNCE) || 0) +
      (countMap.get(EmailEventType.SOFT_BOUNCE) || 0);
    const unsubscribed = countMap.get(EmailEventType.UNSUBSCRIBE) || 0;

    // Update cached counts
    campaign.openCount = opened;
    campaign.clickCount = clicked;
    campaign.bounceCount = bounced;
    campaign.unsubscribeCount = unsubscribed;
    await this.campaignRepository.save(campaign);

    // Calculate rates
    const sent = campaign.sentCount || 1;
    const openRate = (opened / sent) * 100;
    const clickRate = (clicked / sent) * 100;
    const bounceRate = (bounced / sent) * 100;

    // Get recent events
    const recentEvents = await this.eventRepository.find({
      where: { campaignId: id },
      order: { eventTimestamp: 'DESC' },
      take: 50,
    });

    return {
      campaign,
      stats: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        failed: campaign.failedCount,
        opened,
        clicked,
        bounced,
        unsubscribed,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
      },
      recentEvents,
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async handleWebhook(
    payload: any,
    headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    const signature =
      headers['x-webhook-secret'] || headers['X-Webhook-Secret'] || '';

    // Verify signature
    if (!this.brevoProvider.verifyWebhookSignature(payload, signature)) {
      this.logger.warn('Invalid webhook signature received');
      return { received: false };
    }

    // Parse webhook
    const event = this.brevoProvider.parseWebhook(payload, headers);

    if (!event) {
      this.logger.warn('Failed to parse webhook payload');
      return { received: false };
    }

    // Find the recipient by provider message ID or email
    const recipient = await this.recipientRepository.findOne({
      where: [
        { providerMessageId: event.messageId },
        { email: event.email },
      ],
      order: { createdAt: 'DESC' },
    });

    if (!recipient) {
      this.logger.warn(`No recipient found for webhook event: ${event.email}`);
      return { received: true };
    }

    // Map event type
    const eventType = this.mapEventType(event.event);

    // Create event record
    const emailEvent = this.eventRepository.create({
      campaignId: recipient.campaignId,
      contactId: recipient.contactId,
      leadId: recipient.leadId,
      email: event.email,
      eventType,
      providerMessageId: event.messageId,
      eventTimestamp: event.timestamp,
      metadata: event.metadata,
    });

    await this.eventRepository.save(emailEvent);

    // Handle unsubscribe
    if (eventType === EmailEventType.UNSUBSCRIBE) {
      await this.processUnsubscribe(event.email, recipient.campaignId);
    }

    // Update campaign counts
    await this.updateCampaignCounts(recipient.campaignId, eventType);

    return { received: true };
  }

  private mapEventType(event: string): EmailEventType {
    const mapping: Record<string, EmailEventType> = {
      sent: EmailEventType.SENT,
      delivered: EmailEventType.DELIVERED,
      open: EmailEventType.OPEN,
      click: EmailEventType.CLICK,
      bounce: EmailEventType.BOUNCE,
      hard_bounce: EmailEventType.HARD_BOUNCE,
      soft_bounce: EmailEventType.SOFT_BOUNCE,
      spam: EmailEventType.SPAM,
      unsubscribe: EmailEventType.UNSUBSCRIBE,
      error: EmailEventType.ERROR,
    };

    return mapping[event] || EmailEventType.ERROR;
  }

  private async updateCampaignCounts(
    campaignId: number,
    eventType: EmailEventType,
  ): Promise<void> {
    const countMapping: Record<string, string> = {
      [EmailEventType.OPEN]: 'openCount',
      [EmailEventType.CLICK]: 'clickCount',
      [EmailEventType.BOUNCE]: 'bounceCount',
      [EmailEventType.HARD_BOUNCE]: 'bounceCount',
      [EmailEventType.SOFT_BOUNCE]: 'bounceCount',
      [EmailEventType.UNSUBSCRIBE]: 'unsubscribeCount',
    };

    const field = countMapping[eventType];
    if (field) {
      await this.campaignRepository.increment({ id: campaignId }, field, 1);
    }
  }

  // ============================================
  // UNSUBSCRIBE HANDLING
  // ============================================

  async processUnsubscribe(
    email: string,
    campaignId?: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<boolean> {
    const lowerEmail = email.toLowerCase();

    // Check if already unsubscribed
    const existing = await this.unsubscribedRepository.findOne({
      where: { email: lowerEmail },
    });

    if (existing) {
      return true; // Already unsubscribed
    }

    // Add to unsubscribed list
    const unsubscribed = this.unsubscribedRepository.create({
      email: lowerEmail,
      sourceCampaignId: campaignId,
      ipAddress,
      userAgent,
    });

    await this.unsubscribedRepository.save(unsubscribed);

    this.logger.log(`Email unsubscribed: ${lowerEmail}`);

    return true;
  }

  async handleUnsubscribeToken(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; email?: string }> {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
      const { email, campaignId } = payload;

      if (!email) {
        return { success: false };
      }

      await this.processUnsubscribe(email, campaignId, ipAddress, userAgent);

      return { success: true, email };
    } catch (error) {
      this.logger.error(`Failed to process unsubscribe token: ${error}`);
      return { success: false };
    }
  }

  async isUnsubscribed(email: string): Promise<boolean> {
    const count = await this.unsubscribedRepository.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  async getUnsubscribedList(
    page: number = 1,
    limit: number = 50,
  ): Promise<{ items: UnsubscribedEmail[]; total: number }> {
    const [items, total] = await this.unsubscribedRepository.findAndCount({
      order: { unsubscribedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async removeUnsubscribe(email: string): Promise<void> {
    await this.unsubscribedRepository.delete({ email: email.toLowerCase() });
  }

  async unsubscribeEmail(email: string, reason?: string): Promise<UnsubscribedEmail> {
    const lowerEmail = email.toLowerCase();
    let existing = await this.unsubscribedRepository.findOne({ where: { email: lowerEmail } });
    if (existing) return existing;

    const unsubscribed = this.unsubscribedRepository.create({
      email: lowerEmail,
      reason,
    });
    return this.unsubscribedRepository.save(unsubscribed);
  }
}
