import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport'; // Added import
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy'; // Added import
import { JwtAuthGuard } from './jwt-auth.guard'; // Added import for export consistency
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    PassportModule, // Import PassportModule
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Provide JwtStrategy
  exports: [JwtAuthGuard, PassportModule] // Export if needed elsewhere
})
export class AuthModule { }

