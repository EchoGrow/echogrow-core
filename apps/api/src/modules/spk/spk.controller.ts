import { Controller, Get, Post, Param } from '@nestjs/common';
import { SpkService } from './spk.service';

@Controller('interviews')
export class SpkController {
  constructor(private readonly spkService: SpkService) {}

  @Get(':id/spk-export')
  async getSpkExport(@Param('id') id: string) {
    return this.spkService.getSpkExport(id);
  }

  @Post(':id/spk-rebuild')
  async rebuildSpk(@Param('id') id: string) {
    await this.spkService.rebuildSpkProfile(id);
    return { interviewId: id, status: 'rebuilt' };
  }
}