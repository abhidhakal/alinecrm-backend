import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';
import { Institution } from './institution.entity';

@Entity('mindfulness_sessions')
export class Mindfulness {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.mindfulnessSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  type: string;

  @OneToMany(() => Task, (task) => task.relatedMindfulness)
  tasks: Task[];

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
