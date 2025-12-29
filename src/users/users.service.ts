import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UploadService } from '../upload/upload.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private uploadService: UploadService,
  ) { }

  async findAll(institutionId: number) {
    if (!institutionId) return []; // Safety check
    return this.userRepository.find({
      where: { institutionId },
      select: ['id', 'name', 'email', 'role', 'profilePicture'],
    });
  }

  async findOne(id: number, institutionId: number) {
    const user = await this.userRepository.findOne({
      where: { id, institutionId },
      select: ['id', 'name', 'email', 'role', 'profilePicture']
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, institutionId: number) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email }
    });
    if (existingUser) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      passwordHash: hashedPassword,
      institutionId, // Assign to current admin's institution
    });

    const savedUser = await this.userRepository.save(user);
    const { passwordHash, ...result } = savedUser;
    return result;
  }

  async update(id: number, dto: UpdateUserDto, institutionId: number) {
    const user = await this.userRepository.findOne({ where: { id, institutionId } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email }
      });
      if (existingUser) throw new ConflictException('Email already registered');
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // Handle profile picture deletion if a new one is provided
    if (dto.profilePicture && user.profilePicture && user.profilePicture !== dto.profilePicture) {
      await this.uploadService.deleteProfilePicture(user.profilePicture);
    }

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.role) user.role = dto.role;
    if (dto.profilePicture !== undefined) user.profilePicture = dto.profilePicture;
    if (dto.currency) user.currency = dto.currency;

    const updatedUser = await this.userRepository.save(user);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }

  async remove(id: number, institutionId: number) {
    const user = await this.userRepository.findOne({ where: { id, institutionId } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture) {
      await this.uploadService.deleteProfilePicture(user.profilePicture);
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }
}
