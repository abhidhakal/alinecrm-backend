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

export enum EmailEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPEN = 'open',
  CLICK = 'click',
  BOUNCE = 'bounce',
  SOFT_BOUNCE = 'soft_bounce',
  HARD_BOUNCE = 'hard_bounce',
  SPAM = 'spam',
  UNSUBSCRIBE = 'unsubscribe',
  ERROR = 'error',
}

@Entity('email_events')
@Index(['campaignId', 'eventType'])
@Index(['email', 'eventType'])
export class EmailEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id' })
  campaignId: number;

  @ManyToOne(() => EmailCampaign, (campaign) => campaign.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EmailCampaign;

  // Link to contact if applicable
  @Column({ name: 'contact_id', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  // Link to lead if applicable
  @Column({ name: 'lead_id', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column()
  email: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EmailEventType,
  })
  eventType: EmailEventType;

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId: string;

  // Store additional webhook data
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'event_timestamp', type: 'timestamp' })
  eventTimestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
