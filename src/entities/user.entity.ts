import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany, // Added OneToMany
  JoinColumn,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Lead } from './lead.entity';
import { Task } from './task.entity';
import { Campaign } from './campaign.entity';
import { Mindfulness } from './mindfulness.entity';
import { Contact } from './contact.entity';
import { Revenue } from './revenue.entity';
import { Institution } from './institution.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture: string;

  @ManyToMany(() => Lead, (lead) => lead.assignedTo)
  leads: Lead[];

  @ManyToMany(() => Task, (task) => task.assignedTo)
  assignedTasks: Task[];

  @OneToMany(() => Task, (task) => task.assignedBy)
  createdTasks: Task[];

  @OneToMany(() => Campaign, (campaign) => campaign.createdBy)
  campaigns: Campaign[];

  @OneToMany(() => Mindfulness, (mindfulness) => mindfulness.user)
  mindfulnessSessions: Mindfulness[];

  @ManyToMany(() => Contact, (contact) => contact.assignedTo)
  contacts: Contact[];

  @OneToMany(() => Revenue, (revenue) => revenue.user)
  revenues: Revenue[];

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @Column({ default: 'NPR' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
