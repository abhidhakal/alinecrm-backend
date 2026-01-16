import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Get()
  async search(@Query('q') query: string, @Request() req) {
    return this.searchService.globalSearch(query, req.user);
  }
}
