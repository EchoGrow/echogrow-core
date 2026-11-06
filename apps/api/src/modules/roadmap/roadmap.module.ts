import { Module } from '@nestjs/common';
import { RoadmapService } from './roadmap.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [RoadmapService],
  exports: [RoadmapService],
})
export class RoadmapModule {}