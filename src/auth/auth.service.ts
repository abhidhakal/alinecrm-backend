import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../entities/user.entity';

import { Institution } from '../entities/institution.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Institution)
    private institutionRepository: Repository<Institution>,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email }
    });
    if (existingUser) throw new UnauthorizedException('Email already registered');

    // 1. Create the Institution (Company)
    const institution = this.institutionRepository.create({
      name: dto.companyName
    });
    const savedInstitution = await this.institutionRepository.save(institution);

    // 2. Create the User (Admin)
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash: hashedPassword,
      role: 'admin', // First user is always admin
      institution: savedInstitution // Link to institution
    });

    await this.userRepository.save(user); // cascading save logic might be cleaner but explicit is safer here

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: savedInstitution.id
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['institution'] // Load institution to get ID if needed, though column institutionId exists
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // Include institutionId in payload
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId
    };

    const token = this.jwtService.sign(payload, { secret: process.env.JWT_SECRET || 'your-secret-key', expiresIn: '7d' });
    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        institutionId: user.institutionId,
        institutionName: user.institution?.name
      }
    };
  }
}
