import { Injectable, Logger } from '@nestjs/common';
import { SpeakerTurn } from '@echogrow/shared';

@Injectable()
export class TranscriptParserService {
  private readonly logger = new Logger(TranscriptParserService.name);

  // Matches lines like:
  // [00:01:23] Interviewer: Hello
  // [01:23] Candidate: Hi
  // Interviewer [00:01:23]: Hello
  // Interviewer (00:01:23): Hello
  // Interviewer: Hello
  private readonly turnHeaderRegex =
    /^(?:\[(?<ts1>\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?(?<speaker>[A-Za-z0-9 _-]+?)(?:\s*[[/(](?<ts2>\d{1,2}:\d{2}(?::\d{2})?)[\])])?\s*:\s*(?<text>.*)$/;

  /**
   * Parses raw transcript string into an array of speaker turns with speaker, text, and timestamp.
   */
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

      if (!line) {
        // Skip empty lines, but preserve turn if multiline continues
        continue;
      }

      const match = line.match(this.turnHeaderRegex);

      if (match && match.groups?.speaker) {
        // We found a new speaker turn
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
        // Multiline continuation of previous speaker's turn
        currentTurn.text = currentTurn.text ? `${currentTurn.text} ${line}` : line;
      } else {
        // Fallback for lines before any speaker match (e.g. intro text)
        // If it starts like dialogue, treat as unknown speaker turn
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

  /**
   * Normalizes speaker name to standard 'Interviewer' or 'Candidate' when recognizable.
   */
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

  /**
   * Formats speaker turns into a clean, annotated representation for prompt injection.
   */
  formatForPrompt(turns: SpeakerTurn[]): string {
    return turns
      .map((turn) => {
        const ts = turn.timestamp ? `[${turn.timestamp}] ` : '';
        return `${ts}${turn.speaker}: ${turn.text}`;
      })
      .join('\n\n');
  }

  /**
   * Generates a synthetic progression timestamp (MM:SS) if the raw transcript lacks timestamps.
   */
  private generateEstimatedTimestamp(index: number): string {
    const totalSeconds = index * 30; // 30 seconds per estimated turn
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}

