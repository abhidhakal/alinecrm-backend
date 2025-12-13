import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity('campaign_recipients')
export class CampaignRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.recipients)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column()
  email: string;

  @Column()
  status: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
