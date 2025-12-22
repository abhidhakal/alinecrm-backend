import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll() {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role'], // Don't return passwordHash
    });
  }

  findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }
}
