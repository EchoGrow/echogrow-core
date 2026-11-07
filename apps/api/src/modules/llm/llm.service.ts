import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ZodSchema } from 'zod';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate<T>(prompt: string, schema: ZodSchema<T>, maxRetries = 2): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`LLM call attempt ${attempt + 1}/${maxRetries + 1}`);

        const response = await this.ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: (schema as any).toJSONSchema
              ? (schema as any).toJSONSchema()
              : schema,
            temperature: 0.2,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        const parsed = JSON.parse(text);
        const validated = schema.parse(parsed);

        this.logger.log(`LLM call succeeded on attempt ${attempt + 1}`);
        return validated;
      } catch (error: any) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const causeCode = error?.cause?.code ?? error?.cause?.message ?? 'n/a';
        this.logger.warn(
          `LLM call failed on attempt ${attempt + 1}: ${message} | cause: ${causeCode}`,
        );

        if (attempt < maxRetries) {
          const baseDelay = 1000 * Math.pow(2, attempt);
          const jitter = Math.random() * 500;
          const delay = baseDelay + jitter;
          this.logger.log(`Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const finalMessage = lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.error(`LLM call failed after ${maxRetries + 1} attempts`);
    throw new Error(`LLM generation failed: ${finalMessage}`);
  }
}