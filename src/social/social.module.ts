import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { SocialChannel } from '../entities/social-channel.entity';
import { SocialPost } from '../entities/social-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SocialChannel, SocialPost])],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule { }
