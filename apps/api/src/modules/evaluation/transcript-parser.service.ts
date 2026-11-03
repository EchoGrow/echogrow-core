import { Injectable, Logger } from '@nestjs/common';
import { SpeakerTurn } from '@echogrow/shared';

@Injectable()
export class TranscriptParserService {
  private readonly logger = new Logger(TranscriptParserService.name);

  private readonly turnHeaderRegex =
    /^(?:\[(?<ts1>\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?(?<speaker>[A-Za-z0-9 _-]+?)(?:\s*[[/(](?<ts2>\d{1,2}:\d{2}(?::\d{2})?)[\])])?\s*:\s*(?<text>.*)$/;

  parse(rawTranscript: string): SpeakerTurn[] {
    if (!rawTranscript || !rawTranscript.trim()) {
      return [];
    }

    const lines = rawTranscript.split(/\r?\n/);
    const turns: SpeakerTurn[] = [];

    let currentTurn: SpeakerTurn | null = null;
    let turnIndex = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) continue;

      const match = line.match(this.turnHeaderRegex);

      if (match && match.groups?.speaker) {
        if (currentTurn) {
          turns.push(currentTurn);
        }

        const rawSpeaker = match.groups.speaker.trim();
        const normalizedSpeaker = this.normalizeSpeaker(rawSpeaker);
        const timestamp =
          match.groups.ts1 || match.groups.ts2 || this.generateEstimatedTimestamp(turnIndex);
        const text = (match.groups.text || '').trim();

        currentTurn = {
          speaker: normalizedSpeaker,
          text,
          timestamp,
        };
        turnIndex++;
      } else if (currentTurn) {
        currentTurn.text = currentTurn.text ? `${currentTurn.text} ${line}` : line;
      } else {
        currentTurn = {
          speaker: 'Candidate',
          text: line,
          timestamp: this.generateEstimatedTimestamp(turnIndex),
        };
        turnIndex++;
      }
    }

    if (currentTurn) {
      turns.push(currentTurn);
    }

    this.logger.debug(`Parsed ${turns.length} speaker turns from transcript`);
    return turns;
  }

  normalizeSpeaker(speaker: string): 'Interviewer' | 'Candidate' | string {
    const lower = speaker.toLowerCase();
    if (lower.includes('interviewer') || lower.includes('host') || lower.includes('recruiter')) {
      return 'Interviewer';
    }
    if (lower.includes('candidate') || lower.includes('interviewee') || lower.includes('applicant')) {
      return 'Candidate';
    }
    return speaker;
  }

  formatForPrompt(turns: SpeakerTurn[]): string {
    return turns
      .map((turn) => {
        const ts = turn.timestamp ? `[${turn.timestamp}] ` : '';
        return `${ts}${turn.speaker}: ${turn.text}`;
      })
      .join('\n\n');
  }

  private generateEstimatedTimestamp(index: number): string {
    const totalSeconds = index * 30;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Calculates a confidence score (0.0 to 1.0) based on transcript quality.
   * Low confidence triggers human review instead of automatic scoring.
   */
  calculateConfidence(rawTranscript: string): number {
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return 0;
    }

    const text = rawTranscript.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    let score = 1.0;

    // 1. Word count penalty
    if (wordCount < 50) score -= 0.5;
    else if (wordCount < 150) score -= 0.2;

    // 2. Noise indicators penalty
    const noiseIndicators = ['[inaudible', '[static', '[audio cuts', '[noise', '...'];
    const noiseCount = noiseIndicators.filter((ind) => text.includes(ind)).length;
    score -= noiseCount * 0.15;

    // 3. Filler word penalty (um, uh, like)
    const fillers = [' um ', ' uh ', ' like '];
    let fillerCount = 0;
    for (const f of fillers) {
      const matches = text.match(new RegExp(f, 'g'));
      if (matches) fillerCount += matches.length;
    }
    if (fillerCount > 5) score -= 0.2;
    else if (fillerCount > 2) score -= 0.1;

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
  }
}