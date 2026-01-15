import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialChannel } from '../entities/social-channel.entity';
import { SocialPost } from '../entities/social-post.entity';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(SocialChannel)
    private channelRepo: Repository<SocialChannel>,
    @InjectRepository(SocialPost)
    private postRepo: Repository<SocialPost>,
  ) { }

  async getChannels(institutionId: number) {
    return this.channelRepo.find({ where: { institutionId } });
  }

  async addChannel(institutionId: number, platform: string, handle: string) {
    const channel = this.channelRepo.create({ institutionId, platform, handle });
    return this.channelRepo.save(channel);
  }

  async deleteChannel(id: number, institutionId: number) {
    return this.channelRepo.delete({ id, institutionId });
  }

  async getRecentPosts(institutionId: number) {
    return this.postRepo.find({
      where: { institutionId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async logPost(institutionId: number, userId: number, content: string, platforms: string[]) {
    const post = this.postRepo.create({ institutionId, userId, content, platforms });
    return this.postRepo.save(post);
  }
}
