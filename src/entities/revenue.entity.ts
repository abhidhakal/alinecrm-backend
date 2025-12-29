import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Lead } from './lead.entity';
import { Task } from './task.entity';
import { Institution } from './institution.entity';

@Entity('revenues')
export class Revenue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'lead_id' })
  leadId: number;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.revenues)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Task, (task) => task.relatedRevenue)
  tasks: Task[];

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
