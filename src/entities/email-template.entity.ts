import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Institution } from './institution.entity';

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

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id', nullable: true })
  institutionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
