import { Injectable, Logger } from '@nestjs/common';
import { SpeakerTurn } from '@echogrow/shared';

@Injectable()
export class TranscriptParserService {
  private readonly logger = new Logger(TranscriptParserService.name);

  parse(rawTranscript: string): SpeakerTurn[] {
    if (!rawTranscript || !rawTranscript.trim()) {
      return [];
    }

    // إذا كان النص كله سطراً واحداً (بدون \n) ويحتوي على "Interviewer:"،
    // نقسمه يدوياً بناءً على "Interviewer:" و "Candidate:"
    let lines: string[];

    if (!rawTranscript.includes('\n') && rawTranscript.includes('Interviewer:')) {
      // النص كله في سطر واحد: نقسمه بناءً على "Interviewer:" و "Candidate:"
      lines = rawTranscript
        .split(/(?=Interviewer:|Candidate:|Host:|Applicant:)/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // النص يحتوي على أسطر: نقسمه عادياً
      lines = rawTranscript.split(/\r?\n/);
    }

    const turns: SpeakerTurn[] = [];
    let currentTurn: SpeakerTurn | null = null;
    let turnIndex = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Regex: يلتقط "Interviewer:" أو "Candidate:" أو "Host:" أو "Applicant:"
      const match = line.match(
        /^(?<speaker>Interviewer|Candidate|Host|Applicant)\s*:\s*(?<text>.*)$/i,
      );

      if (match && match.groups?.speaker && match.groups?.text) {
        if (currentTurn) {
          turns.push(currentTurn);
        }

        const rawSpeaker = match.groups.speaker.trim();
        const normalizedSpeaker = this.normalizeSpeaker(rawSpeaker);
        const text = match.groups.text.trim();

        currentTurn = {
          speaker: normalizedSpeaker,
          text,
          timestamp: this.generateEstimatedTimestamp(turnIndex),
        };
        turnIndex++;
      } else if (currentTurn) {
        // إذا لم يكن سطراً جديداً، أضفه إلى الدور الحالي
        currentTurn.text = currentTurn.text
          ? `${currentTurn.text} ${line}`
          : line;
      } else {
        // نص بدون متحدث (نادر)
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
    if (
      lower.includes('interviewer') ||
      lower.includes('host') ||
      lower.includes('recruiter')
    ) {
      return 'Interviewer';
    }
    if (
      lower.includes('candidate') ||
      lower.includes('interviewee') ||
      lower.includes('applicant')
    ) {
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