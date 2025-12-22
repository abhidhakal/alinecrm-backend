import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';
import { Contact } from './contact.entity';

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, name: 'company_name' })
  companyName: string;

  @Column({ nullable: true, name: 'job_title' })
  jobTitle: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW
  })
  status: LeadStatus;

  @Column({ nullable: true })
  source: string; // e.g., LinkedIn, Website, Referral

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'potential_value' })
  potentialValue: number;

  @Column({ type: 'int', default: 0 })
  probability: number; // 0-100

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: number;

  @ManyToOne(() => User, (user) => user.leads)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ name: 'contact_id', nullable: true })
  contactId: number;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @OneToMany(() => Task, (task) => task.relatedLead)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
