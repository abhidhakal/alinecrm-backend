import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Delete('broadcast/:groupId')
  async deleteAnnouncement(@Param('groupId') groupId: string, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only admins can delete announcements');
    }
    return this.notificationService.deleteAnnouncement(groupId);
  }

  @Get()
  async getNotifications(@Request() req) {
    // JwtStrategy returns userId, not id
    return this.notificationService.findAllForUser(req.user.userId || req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.userId || req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(+id, req.user.userId || req.user.id);
  }

  @Post('broadcast')
  async broadcast(@Body() data: { title: string; message: string; link?: string }, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only admins can broadcast announcements');
    }
    return this.notificationService.broadcast(data);
  }
}
