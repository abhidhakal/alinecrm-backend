import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
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

  @ManyToMany(() => User, (user) => user.contacts)
  @JoinTable({
    name: 'contact_assignees',
    joinColumn: { name: 'contact_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignedTo: User[];

  @OneToMany(() => Task, (task) => task.relatedContact)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
