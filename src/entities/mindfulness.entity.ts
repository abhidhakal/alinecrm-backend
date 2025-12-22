import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

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

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
