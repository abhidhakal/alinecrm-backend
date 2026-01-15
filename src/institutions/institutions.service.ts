import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../entities/institution.entity';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private institutionRepo: Repository<Institution>,
  ) { }

  async getInstitutionSettings(institutionId: number) {
    const institution = await this.institutionRepo.findOne({ where: { id: institutionId } });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    return {
      id: institution.id,
      name: institution.name,
      weekendDays: institution.weekendDays || [0, 6],
    };
  }

  async updateWeekendDays(institutionId: number, weekendDays: number[]) {
    const institution = await this.institutionRepo.findOne({ where: { id: institutionId } });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    // Validate weekendDays array
    if (!Array.isArray(weekendDays) || weekendDays.some(d => d < 0 || d > 6)) {
      throw new ForbiddenException('Invalid weekend days. Must be an array of numbers 0-6.');
    }

    institution.weekendDays = weekendDays;
    await this.institutionRepo.save(institution);

    return {
      message: 'Weekend days updated successfully',
      weekendDays: institution.weekendDays,
    };
  }
}
