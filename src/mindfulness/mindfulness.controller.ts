import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MindfulnessService } from './mindfulness.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mindfulness')
@UseGuards(JwtAuthGuard)
export class MindfulnessController {
  constructor(private readonly mindfulnessService: MindfulnessService) { }

  @Get('today')
  async getTodayThought(@Request() req) {
    return this.mindfulnessService.getTodayThought(req.user.institutionId, req.user.id);
  }

  @Post('thought')
  async saveThought(@Request() req, @Body() body: { content: string; isPinned: boolean }) {
    return this.mindfulnessService.saveThought(req.user.institutionId, req.user.id, body.content, body.isPinned);
  }

  @Get('pinned')
  async getPinnedThought(@Request() req) {
    return this.mindfulnessService.getPinnedThought(req.user.institutionId, req.user.id);
  }
}
