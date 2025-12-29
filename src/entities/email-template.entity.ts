import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ name: 'suggested_title', nullable: true })
  suggestedTitle: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
