import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key', // Ensure this matches AuthModule
    });
  }

  async validate(payload: any) {
    // This payload is the decoded JWT.
    // What you return here is injected into request.user
    return { userId: payload.sub, email: payload.email, role: payload.role, institutionId: payload.institutionId };
  }
}
