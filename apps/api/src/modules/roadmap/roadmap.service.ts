import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSkillExtractionPrompt,
  buildRoadmapFromGapsPrompt,
  SkillExtractionSchema,
} from './roadmap.prompts';
import { RoadmapGenerationSchema, RoadmapGeneration, whitelist } from '@echogrow/shared';

@Injectable()
export class RoadmapService {
  private readonly logger = new Logger(RoadmapService.name);

  // حجم المجموعة: كم اقتباساً نرسل في كل استدعاء LLM
  private readonly BATCH_SIZE = 2;

  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAndSave(scorecardId: string): Promise<RoadmapGeneration | null> {
    // 1. جلب جميع الأبعاد
    const dimensions = await this.prisma.dimension.findMany({
      where: { scorecardId },
      select: {
        id: true,
        dimensionType: true,
        score: true,
        reason: true,
        evidenceQuote: true,
      },
    });

    if (dimensions.length === 0) {
      this.logger.log(`No dimensions found for scorecard ${scorecardId}. Skipping roadmap.`);
      return null;
    }

    // 2. جلب الـ transcript الكامل (من الـ interview المرتبط بالـ scorecard)
    const scorecard = await this.prisma.scorecard.findUnique({
      where: { id: scorecardId },
      include: { interview: { select: { transcript: true } } },
    });

    if (!scorecard) {
      this.logger.error(`Scorecard ${scorecardId} not found.`);
      return null;
    }

    const transcript = scorecard.interview.transcript;
    this.logger.log(`Analyzing ${dimensions.length} dimensions for skill gaps (multi-pass, transcript=${transcript.length} chars)...`);

    // 3. تجهيز قائمة الأدلة (مع score + reason)
    const evidenceList = dimensions.map((d) => ({
      dimension: this.mapDimensionType(d.dimensionType),
      quote: (d.evidenceQuote as any)?.quote || 'No evidence provided.',
      score: d.score,
      reason: d.reason || undefined,
    }));

    // 4. Multi-Pass Extraction: تقسيم الأدلة إلى مجموعات
    const allSkills: string[] = [];
    const totalBatches = Math.ceil(evidenceList.length / this.BATCH_SIZE);

    for (let i = 0; i < evidenceList.length; i += this.BATCH_SIZE) {
      const batch = evidenceList.slice(i, i + this.BATCH_SIZE);
      const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;

      this.logger.log(
        `Extracting skills from batch ${batchNumber}/${totalBatches} (${batch.length} evidence items)...`,
      );

      try {
        const prompt = buildSkillExtractionPrompt(batch, transcript);
        const result = await this.llm.generate(prompt, SkillExtractionSchema);
        this.logger.log(
          `Batch ${batchNumber} extracted ${result.skills.length} skills: [${result.skills.join(', ')}]`,
        );
        allSkills.push(...result.skills);
      } catch (error: any) {
        this.logger.warn(
          `Failed to extract skills from batch ${batchNumber}: ${error.message}. Skipping batch.`,
        );
      }
    }

    // 5. دمج الفجوات وإزالة التكرار (case-insensitive)
    const uniqueSkillsMap = new Map<string, string>();
    for (const skill of allSkills) {
      const normalized = skill.trim().toLowerCase();
      if (!uniqueSkillsMap.has(normalized)) {
        uniqueSkillsMap.set(normalized, skill.trim());
      }
    }
    const uniqueSkills = Array.from(uniqueSkillsMap.values());

    if (uniqueSkills.length === 0) {
      this.logger.log(`No skill gaps found for scorecard ${scorecardId}. Skipping roadmap.`);
      return null;
    }

    this.logger.log(
      `Total unique skills extracted: ${uniqueSkills.length}: [${uniqueSkills.join(', ')}]`,
    );

    // 6. توليد Roadmap من الفجوات المدمجة
    const evidenceContext = evidenceList
      .map((e) => `- ${e.dimension} (Score: ${e.score}/5): "${e.quote}"`)
      .join('\n');

    const roadmapPrompt = buildRoadmapFromGapsPrompt(uniqueSkills, evidenceContext);
    const roadmapResult = await this.llm.generate(roadmapPrompt, RoadmapGenerationSchema);

    this.logger.log(
      `Roadmap generated with ${roadmapResult.gaps.length} gaps and ${roadmapResult.roadmap.length} weeks.`,
    );

    // 7. حفظ SkillGaps
    const skillGapMap = new Map<string, string>();

    for (const gap of roadmapResult.gaps) {
      const matchingDimension =
        dimensions.find((d) => {
          const dimensionName = this.mapDimensionType(d.dimensionType);
          const evidenceQuote = (d.evidenceQuote as any)?.quote || '';
          return (
            gap.toLowerCase().includes(dimensionName.toLowerCase()) ||
            evidenceQuote.toLowerCase().includes(gap.toLowerCase())
          );
        }) || dimensions[0];

      const skillGap = await this.prisma.skillGap.create({
        data: {
          dimensionId: matchingDimension.id,
          skillName: gap,
          priority: 'MEDIUM',
        },
      });
      skillGapMap.set(gap, skillGap.id);
    }

    // 8. حفظ Roadmap
    const itemsToCreate = roadmapResult.roadmap.map((item) => {
      const skillGapId =
        skillGapMap.get(item.skillName) || skillGapMap.values().next().value;

      if (!skillGapId) {
        throw new Error(`No skill gap found for skill: ${item.skillName}`);
      }

      return {
        week: item.week,
        description: item.task,
        resourceUrl: this.validateAndFixResourceUrl(item.skillName, item.resourceUrl),
        skillGap: {
          connect: { id: skillGapId },
        },
      };
    });

    const roadmap = await this.prisma.roadmap.create({
      data: {
        scorecardId,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
      },
    });

    this.logger.log(`Roadmap saved with ${roadmap.items.length} items.`);
    return roadmapResult;
  }

  private mapDimensionType(type: string): string {
    switch (type) {
      case 'TECHNICAL_DEPTH':
        return 'Technical Depth';
      case 'COMMUNICATION':
        return 'Communication Clarity';
      case 'DOMAIN_EXPERIENCE':
        return 'Domain Experience';
      case 'PROBLEM_SOLVING':
        return 'Problem Solving';
      default:
        return type;
    }
  }

  private validateAndFixResourceUrl(skillName: string, url: string): string {
    const approvedUrls = new Set<string>();
    for (const skill of whitelist) {
      for (const resource of skill.resources) {
        approvedUrls.add(resource.resourceUrl);
      }
    }

    if (approvedUrls.has(url)) {
      return url;
    }

    const searchQuery = encodeURIComponent(`${skillName} tutorial`);
    const fallbackUrl = `https://www.google.com/search?q=${searchQuery}`;

    this.logger.warn(
      `Resource URL "${url}" for skill "${skillName}" is not in the whitelist. Using fallback: ${fallbackUrl}`,
    );

    return fallbackUrl;
  }
}