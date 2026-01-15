import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Lead } from './lead.entity';
import { Contact } from './contact.entity';
import { Campaign } from './campaign.entity';
import { Mindfulness } from './mindfulness.entity';
import { Revenue } from './revenue.entity';
import { Institution } from './institution.entity';

export enum TaskStatus {
  TODO = 'To-Do',
  IN_PROGRESS = 'In Progress',
  COMPLETE = 'Complete',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'date', name: 'assigned_date', nullable: true })
  assignedDate: Date;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @ManyToMany(() => User, (user) => user.assignedTasks)
  @JoinTable({
    name: 'task_assignees',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignedTo: User[];

  @ManyToOne(() => User, (user) => user.createdTasks, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User | null;

  @ManyToOne(() => Lead, (lead) => lead.tasks, { nullable: true })
  @JoinColumn({ name: 'related_lead_id' })
  relatedLead: Lead;

  @ManyToOne(() => Contact, (contact) => contact.tasks, { nullable: true })
  @JoinColumn({ name: 'related_contact_id' })
  relatedContact: Contact;

  @ManyToOne(() => Campaign, (campaign) => campaign.tasks, { nullable: true })
  @JoinColumn({ name: 'related_campaign_id' })
  relatedCampaign: Campaign;

  @ManyToOne(() => Mindfulness, (mindfulness) => mindfulness.tasks, { nullable: true })
  @JoinColumn({ name: 'related_mindfulness_id' })
  relatedMindfulness: Mindfulness;

  @ManyToOne(() => Revenue, (revenue) => revenue.tasks, { nullable: true })
  @JoinColumn({ name: 'related_revenue_id' })
  relatedRevenue: Revenue;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @Column({ name: 'google_event_id', nullable: true })
  googleEventId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

