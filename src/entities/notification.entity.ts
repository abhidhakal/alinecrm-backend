import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id' })
  recipientId: number;

  @Column({
    type: 'varchar', // Using varchar for flexibility with enums
    default: 'SYSTEM',
  })
  category: string; // 'ANNOUNCEMENT' | 'SYSTEM'

  @Column({
    type: 'varchar',
    default: 'general',
  })
  type: string; // 'lead' | 'task' | 'contact' | 'campaign' | 'general'

  @Column({
    type: 'varchar',
    default: 'creation',
  })
  action: string; // 'creation' | 'assignment' | 'broadcast'

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  link: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
