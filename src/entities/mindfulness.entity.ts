import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('mindfulness_sessions')
export class Mindfulness {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.mindfulnessSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  type: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
