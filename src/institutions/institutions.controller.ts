import { Controller, Get, Patch, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstitutionsService } from './institutions.service';

@Controller('institutions')
@UseGuards(JwtAuthGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) { }

  @Get('settings')
  async getSettings(@Request() req) {
    const institutionId = req.user.institutionId;
    if (!institutionId) {
      throw new ForbiddenException('User is not associated with an institution');
    }
    return this.institutionsService.getInstitutionSettings(institutionId);
  }

  @Patch('weekend-days')
  async updateWeekendDays(@Request() req, @Body() body: { weekendDays: number[] }) {
    const { role, institutionId } = req.user;

    // Only admins and superadmins can update institution settings
    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Only admins can update institution settings');
    }

    if (!institutionId) {
      throw new ForbiddenException('User is not associated with an institution');
    }

    return this.institutionsService.updateWeekendDays(institutionId, body.weekendDays);
  }
}
