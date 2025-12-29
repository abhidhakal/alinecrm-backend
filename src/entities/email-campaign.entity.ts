import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { EmailCampaignRecipient } from './email-campaign-recipient.entity';
import { EmailEvent } from './email-event.entity';
import { Institution } from './institution.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum CampaignProvider {
  BREVO = 'brevo',
  SES = 'ses',
  RESEND = 'resend',
}

export enum AudienceSource {
  CONTACTS = 'contacts',
  LEADS = 'leads',
}

// Audience filter rules stored as JSON
export interface AudienceFilter {
  source: AudienceSource;
  filters: {
    status?: string[];
    tags?: string[];
    createdAtFrom?: string;
    createdAtTo?: string;
    hasEmail?: boolean;
    priority?: string[];
    leadSource?: string[];
  };
}

@Entity('email_campaigns')
export class EmailCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  subject: string;

  @Column({ name: 'preview_text', nullable: true })
  previewText: string;

  @Column({ name: 'sender_name' })
  senderName: string;

  @Column({ name: 'sender_email' })
  senderEmail: string;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: CampaignProvider,
    default: CampaignProvider.BREVO,
  })
  provider: CampaignProvider;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  // Store audience filter rules as JSON
  @Column({ name: 'audience_filters', type: 'jsonb' })
  audienceFilters: AudienceFilter;

  // Cached stats for quick access
  @Column({ name: 'total_recipients', default: 0 })
  totalRecipients: number;

  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'failed_count', default: 0 })
  failedCount: number;

  @Column({ name: 'open_count', default: 0 })
  openCount: number;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

  @Column({ name: 'bounce_count', default: 0 })
  bounceCount: number;

  @Column({ name: 'unsubscribe_count', default: 0 })
  unsubscribeCount: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @ManyToOne(() => Institution)
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id' })
  institutionId: number;

  @OneToMany(() => EmailCampaignRecipient, (recipient) => recipient.campaign)
  recipients: EmailCampaignRecipient[];

  @OneToMany(() => EmailEvent, (event) => event.campaign)
  events: EmailEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
