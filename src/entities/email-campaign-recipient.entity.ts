import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailCampaign } from './email-campaign.entity';
import { Contact } from './contact.entity';
import { Lead } from './lead.entity';

export enum RecipientStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('email_campaign_recipients')
@Index(['campaignId', 'email'], { unique: true })
export class EmailCampaignRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id' })
  campaignId: number;

  @ManyToOne(() => EmailCampaign, (campaign) => campaign.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EmailCampaign;

  // Link to contact if source was contacts
  @Column({ name: 'contact_id', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  // Link to lead if source was leads
  @Column({ name: 'lead_id', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column()
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: RecipientStatus,
    default: RecipientStatus.QUEUED,
  })
  status: RecipientStatus;

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
