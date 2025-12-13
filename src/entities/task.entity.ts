import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Lead } from './lead.entity';
import { Contact } from './contact.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column()
  status: string;

  @ManyToOne(() => User, (user) => user.tasks)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @ManyToOne(() => Lead, (lead) => lead.tasks)
  @JoinColumn({ name: 'related_lead_id' })
  relatedLead: Lead;

  @ManyToOne(() => Contact, (contact) => contact.tasks)
  @JoinColumn({ name: 'related_contact_id' })
  relatedContact: Contact;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
