import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Institution } from './institution.entity';
import { User } from './user.entity';

@Entity('social_posts')
export class SocialPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column('simple-array')
  platforms: string[];

  @ManyToOne(() => Institution)
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'institution_id' })
  institutionId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
