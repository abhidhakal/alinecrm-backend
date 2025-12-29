import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, SendCampaignDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  /**
   * Create a new email campaign
   */
  @Post()
  create(@Body() createCampaignDto: CreateCampaignDto, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.create(createCampaignDto, user);
  }

  /**
   * Get all campaigns
   */
  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.findAll(user);
  }

  /**
   * Get a single campaign by ID
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.findOne(id);
  }

  /**
   * Update a campaign
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @Request() req,
  ) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.update(id, updateCampaignDto, user);
  }

  /**
   * Delete a campaign
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.remove(id, user);
  }

  /**
   * Duplicate a campaign
   */
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.duplicate(id, user);
  }

  /**
   * Send a campaign
   */
  @Post(':id/send')
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body() sendCampaignDto: SendCampaignDto,
    @Request() req,
  ) {
    const user = { id: req.user.userId, role: req.user.role } as User;
    return this.campaignsService.sendCampaign(id, sendCampaignDto, user);
  }

  /**
   * Get campaign statistics
   */
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.getStats(id);
  }

  /**
   * Estimate recipient count for audience filters
   */
  @Post('estimate-audience')
  async estimateAudience(@Body() audienceDto: { audienceFilters: any }) {
    const count = await this.campaignsService.estimateRecipientCount(
      audienceDto.audienceFilters,
    );
    return { estimatedCount: count };
  }

  /**
   * Get global unsubscribe list
   */
  @Get('settings/unsubscribed')
  async getUnsubscribed(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.campaignsService.getUnsubscribedList(page, limit);
  }

  /**
   * Manually unsubscribe an email
   */
  @Post('settings/unsubscribed')
  async addUnsubscribed(@Body() data: { email: string; reason?: string }) {
    return this.campaignsService.unsubscribeEmail(data.email, data.reason);
  }

  /**
   * Remove email from unsubscribe list
   */
  @Delete('settings/unsubscribed/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUnsubscribed(@Param('email') email: string) {
    return this.campaignsService.removeUnsubscribe(email);
  }
}
