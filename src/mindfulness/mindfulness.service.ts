import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Mindfulness } from '../entities/mindfulness.entity';

@Injectable()
export class MindfulnessService {
  constructor(
    @InjectRepository(Mindfulness)
    private mindfulnessRepo: Repository<Mindfulness>,
  ) { }

  async getTodayThought(institutionId: number, userId: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.mindfulnessRepo.findOne({
      where: {
        institutionId,
        user: { id: userId },
        type: 'thought',
        timestamp: Between(startOfDay, endOfDay),
      },
    });
  }

  async saveThought(institutionId: number, userId: number, content: string, isPinned: boolean) {
    let thought = await this.getTodayThought(institutionId, userId);

    if (thought) {
      thought.content = content;
      thought.isPinned = isPinned;
    } else {
      thought = this.mindfulnessRepo.create({
        institutionId,
        user: { id: userId },
        type: 'thought', // Fixed type for this feature
        content,
        isPinned,
        timestamp: new Date(),
      });
    }

    return this.mindfulnessRepo.save(thought);
  }

  async getPinnedThought(institutionId: number, userId: number) {
    // Get the latest pinned thought (could be from today or past if we want sticky persistence, 
    // but usually "pinned to dashboard" implies current relevance. Let's start with TODAY's pinned thought
    // or arguably just the *latest* pinned thought ever?)
    // User said "saved for the day", so likely implies daily scope. 
    // However, if I pin something, I probably want to see it. 
    // Let's look for the most recent thought that is pinned.
    return this.mindfulnessRepo.findOne({
      where: {
        institutionId,
        user: { id: userId },
        type: 'thought',
        isPinned: true,
      },
      order: { timestamp: 'DESC' },
    });
  }
}
