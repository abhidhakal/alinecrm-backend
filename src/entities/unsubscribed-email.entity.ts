import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Institution } from './institution.entity';

@Entity('unsubscribed_emails')
@Index(['email', 'institutionId'], { unique: true })
export class UnsubscribedEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @ManyToOne(() => Institution)
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id' })
  institutionId: number;

  // Source campaign that triggered unsubscribe (if known)
  @Column({ type: 'int', name: 'source_campaign_id', nullable: true })
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
