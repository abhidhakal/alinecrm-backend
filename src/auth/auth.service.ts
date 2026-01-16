import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../entities/user.entity';
import { Institution } from '../entities/institution.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Institution)
    private institutionRepository: Repository<Institution>,
    private jwtService: JwtService,
  ) {
    // Initialize email transporter with Brevo SMTP
    console.log('Initializing SMTP with:', {
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      user: process.env.SMTP_USER,
      hasSmtpKey: !!process.env.BREVO_SMTP_KEY,
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
  }

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

    await this.userRepository.save(user);

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
      relations: ['institution']
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateAuthResponse(user);
  }

  async googleLogin(req: any) {
    if (!req.user) throw new BadRequestException('No user from google');

    let user = await this.userRepository.findOne({
      where: { email: req.user.email },
      relations: ['institution']
    });

    if (!user) {
      // 1. Create a default institution for the new user
      const institution = this.institutionRepository.create({
        name: `${req.user.firstName}'s Company`
      });
      const savedInstitution = await this.institutionRepository.save(institution);

      // 2. Create the user as an admin of that institution
      user = this.userRepository.create({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        role: 'admin', // New social users are admins of their own institution
        profilePicture: req.user.picture,
        institution: savedInstitution
      });
      await this.userRepository.save(user);
    }

    return this.generateAuthResponse(user);
  }

  async sendMagicLink(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    const token = this.jwtService.sign({ email }, { expiresIn: '15m' });

    // Use FRONT_URL from env or default to localhost
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const url = `${backendUrl}/auth/magic-link/verify?token=${token}`;

    // Send email
    try {
      const sender = process.env.SMTP_USER;
      if (!sender) throw new Error('SMTP_USER not configured in environment');

      await this.transporter.sendMail({
        from: `"AlineCRM" <${sender}>`,
        to: email,
        subject: 'Your Magic Login Link',
        html: `<p>Click <a href="${url}">here</a> to log in to AlineCRM. This link expires in 15 minutes.</p>`,
      });
      return { message: 'Magic link sent' };
    } catch (error) {
      console.error('Magic Link Email Error:', error);
      throw new BadRequestException(`Failed to send magic link email. Please check SMTP configuration: ${error.message}`);
    }
  }

  async verifyMagicLink(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { email: payload.email },
        relations: ['institution']
      });
      if (!user) throw new UnauthorizedException('User not found');

      return this.generateAuthResponse(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  private generateAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '7d'
    });

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
