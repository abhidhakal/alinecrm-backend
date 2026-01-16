import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async findAllForUser(userId: number) {
    if (!userId) {
      return [];
    }
    return this.notificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(id: number, userId: number) {
    await this.notificationRepository.update(
      { id, recipientId: userId },
      { isRead: true },
    );
    return this.notificationRepository.findOne({ where: { id } });
  }

  async markAllAsRead(userId: number) {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    await this.notificationRepository.update(
      { recipientId: id, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  async create(data: Partial<Notification>) {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async broadcast(data: { title: string; message: string; link?: string }) {
    const users = await this.userRepository.find({ select: ['id'] });
    // Use a Set to ensure unique user IDs
    const uniqueUserIds = Array.from(new Set(users.map(u => u.id)));

    const groupId = `announcement_${Date.now()}`;

    const notifications = uniqueUserIds.map((userId) =>
      this.notificationRepository.create({
        ...data,
        recipientId: userId,
        category: 'ANNOUNCEMENT',
        action: 'broadcast',
        type: 'general',
        groupId: groupId,
      }),
    );
    return this.notificationRepository.save(notifications);
  }

  async deleteAnnouncement(identifier: string) {
    console.log(`[NotificationService] Attempting to delete announcement with identifier: ${identifier}`);

    // 1. Try deleting by groupId directly
    let result = await this.notificationRepository.delete({ groupId: identifier });

    // 2. If nothing deleted, maybe it was passed as an ID?
    if (result.affected === 0) {
      console.log(`[NotificationService] No records found for groupId ${identifier}. Checking as ID...`);

      const id = parseInt(identifier, 10);
      if (!isNaN(id)) {
        const notification = await this.notificationRepository.findOne({ where: { id } });

        if (notification) {
          if (notification.groupId) {
            console.log(`[NotificationService] Found notification ${id} belongs to group ${notification.groupId}. Deleting group.`);
            result = await this.notificationRepository.delete({ groupId: notification.groupId });
          } else {
            console.log(`[NotificationService] Notification ${id} has no groupId. Deleting individually.`);
            result = await this.notificationRepository.delete({ id });
          }
        }
      }
    }

    console.log(`[NotificationService] Final delete result:`, result);
    return result;
  }

  async notifyAdmins(data: { title: string; message: string; link?: string; type: string; action: string }) {
    const admins = await this.userRepository.find({
      where: { role: In(['admin', 'superadmin']) },
    });
    const notifications = admins.map((admin) =>
      this.notificationRepository.create({
        ...data,
        recipientId: admin.id,
        category: 'SYSTEM',
      }),
    );
    return this.notificationRepository.save(notifications);
  }

  async notifyUser(userId: number, data: { title: string; message: string; link?: string; type: string; action: string }) {
    const notification = this.notificationRepository.create({
      ...data,
      recipientId: userId,
      category: 'SYSTEM',
    });
    return this.notificationRepository.save(notification);
  }
}
