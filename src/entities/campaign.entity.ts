import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { CampaignRecipient } from './campaign_recipient.entity';
import { Task } from './task.entity';
import { Institution } from './institution.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => CampaignRecipient, (recipient) => recipient.campaign)
  recipients: CampaignRecipient[];

  @OneToMany(() => Task, (task) => task.relatedCampaign)
  tasks: Task[];

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
