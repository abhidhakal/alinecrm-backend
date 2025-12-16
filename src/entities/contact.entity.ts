import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ nullable: true })
  industry: string;

  @Column({
    type: 'enum',
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  })
  priority: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.contacts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Task, (task) => task.relatedContact)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
