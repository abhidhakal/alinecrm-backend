import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany, // Added OneToMany
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Lead } from './lead.entity';
import { Task } from './task.entity';
import { Campaign } from './campaign.entity';
import { Mindfulness } from './mindfulness.entity';
import { Contact } from './contact.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => Lead, (lead) => lead.assignedTo)
  leads: Lead[];

  @OneToMany(() => Task, (task) => task.assignedTo)
  tasks: Task[];

  @OneToMany(() => Campaign, (campaign) => campaign.createdBy)
  campaigns: Campaign[];

  @OneToMany(() => Mindfulness, (mindfulness) => mindfulness.user)
  mindfulnessSessions: Mindfulness[];

  @OneToMany(() => Contact, (contact) => contact.user)
  contacts: Contact[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
