import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, OneToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
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

export enum LeadSource {
  ORGANIC = 'Organic',
  SOCIAL_MEDIA = 'Social Media',
  WORD_OF_MOUTH = 'Word of Mouth',
  CONTACTS = 'Contacts',
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

  @Column({
    type: 'enum',
    enum: LeadSource,
    nullable: true
  })
  source: LeadSource;

  @Column({ nullable: true, name: 'inquired_for' })
  inquiredFor: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'potential_value' })
  potentialValue: number;

  @Column({ type: 'int', default: 0 })
  probability: number; // 0-100

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToMany(() => User, (user) => user.leads)
  @JoinTable({
    name: 'lead_assignees',
    joinColumn: { name: 'lead_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignedTo: User[];

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
