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
  @Post()
  create(@Body() createCampaignDto: CreateCampaignDto, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.create(createCampaignDto, user);
  }

  @Get()
  findAll(@Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.findOne(id, user); // Updated signature
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @Request() req,
  ) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.update(id, updateCampaignDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.remove(id, user);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.duplicate(id, user);
  }

  @Post(':id/send')
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body() sendCampaignDto: SendCampaignDto,
    @Request() req,
  ) {
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.sendCampaign(id, sendCampaignDto, user);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number, @Request() req) { // Updated to take req
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.getStats(id, user); // Updated signature
  }

  @Post('estimate-audience')
  async estimateAudience(@Body() audienceDto: { audienceFilters: any }, @Request() req) { // Updated to take req
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    const count = await this.campaignsService.estimateRecipientCount(
      audienceDto.audienceFilters,
      user.institutionId // Pass institutionId
    );
    return { estimatedCount: count };
  }

  @Get('settings/unsubscribed')
  async getUnsubscribed(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) { // Updated to take req first
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.getUnsubscribedList(page, limit, user.institutionId); // Pass institutionId
  }

  @Post('settings/unsubscribed')
  async addUnsubscribed(@Body() data: { email: string; reason?: string }, @Request() req) { // Updated to take req
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.unsubscribeEmail(data.email, user.institutionId, data.reason); // Pass institutionId
  }

  @Delete('settings/unsubscribed/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUnsubscribed(@Param('email') email: string, @Request() req) { // Updated to take req
    const user = { id: req.user.userId, role: req.user.role, institutionId: req.user.institutionId } as User;
    return this.campaignsService.removeUnsubscribe(email, user.institutionId); // Pass institutionId
  }
}
