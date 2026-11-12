import { Controller, Get, Post, Param, HttpCode } from '@nestjs/common';
import { SpkService } from './spk.service';

@Controller('interviews')
export class SpkController {
  constructor(private readonly spkService: SpkService) {}

  @Get(':id/spk-export')
  async getSpkExport(@Param('id') id: string) {
    return this.spkService.getSpkExport(id);
  }

  /**
   * Fire-and-forget rebuild. Returns 202 immediately, then rebuilds in the
   * background. The frontend polls spkStatus via GET /interviews/:id/scorecard.
   *
   * This avoids the frontend's 30s fetch timeout killing a legitimate
   * 60-90s LLM operation. If the rebuild fails, spkStatus becomes 'failed'
   * and the UI shows a Retry button.
   */
  @Post(':id/spk-rebuild')
  @HttpCode(202)
  async rebuildSpk(@Param('id') id: string) {
    // Kick off the rebuild in the background. Do NOT await.
    // Errors are handled inside rebuildSpkProfile (writes spkStatus='failed').
    void this.spkService.rebuildSpkProfile(id).catch(() => {
      // Already logged inside the service. Swallow here so the 202 is sent.
    });

    return { interviewId: id, status: 'building' };
  }
}