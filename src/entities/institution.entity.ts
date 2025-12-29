import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
// import { User } from './user.entity';
// import { Contact } from './contact.entity';
// import { Lead } from './lead.entity';
// import { Task } from './task.entity';
// import { Campaign } from './campaign.entity';
// import { Mindfulness } from './mindfulness.entity';
// import { Revenue } from './revenue.entity';
// import { EmailTemplate } from './email-template.entity';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // @OneToMany(() => User, (user) => user.institution)
  // users: User[];

  // @OneToMany(() => Contact, (contact) => contact.institution)
  // contacts: Contact[];

  // @OneToMany(() => Lead, (lead) => lead.institution)
  // leads: Lead[];

  // @OneToMany(() => Task, (task) => task.institution)
  // tasks: Task[];

  // Removed bidirectional relationship to Campaign to avoid circular dependency issues
  // @OneToMany(() => Campaign, (campaign) => campaign.institution)
  // campaigns: Campaign[];

  // @OneToMany(() => Mindfulness, (mindfulness) => mindfulness.institution)
  // mindfulnessSessions: Mindfulness[];

  // @OneToMany(() => Revenue, (revenue) => revenue.institution)
  // revenues: Revenue[];

  // @OneToMany(() => EmailTemplate, (template) => template.institution)
  // emailTemplates: EmailTemplate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
