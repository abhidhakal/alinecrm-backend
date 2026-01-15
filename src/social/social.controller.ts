import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) { }

  @Get('channels')
  async getChannels(@Request() req) {
    return this.socialService.getChannels(req.user.institutionId);
  }

  @Post('channels')
  async addChannel(@Request() req, @Body() body: { platform: string; handle: string }) {
    return this.socialService.addChannel(req.user.institutionId, body.platform, body.handle);
  }

  @Delete('channels/:id')
  async deleteChannel(@Request() req, @Param('id') id: string) {
    return this.socialService.deleteChannel(+id, req.user.institutionId);
  }

  @Get('posts')
  async getRecentPosts(@Request() req) {
    return this.socialService.getRecentPosts(req.user.institutionId);
  }

  @Post('log-post')
  async logPost(@Request() req, @Body() body: { content: string; platforms: string[] }) {
    return this.socialService.logPost(req.user.institutionId, req.user.id, body.content, body.platforms);
  }
}
