import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('unsubscribed_emails')
@Index(['email'], { unique: true })
export class UnsubscribedEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // Source campaign that triggered unsubscribe (if known)
  @Column({ name: 'source_campaign_id', nullable: true })
  sourceCampaignId: number | null;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'unsubscribed_at' })
  unsubscribedAt: Date;
}
