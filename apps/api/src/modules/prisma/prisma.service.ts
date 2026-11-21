import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const useNeon = !!process.env.NEON_DATABASE_URL && process.env.NODE_ENV !== 'test';

    let adapter;
    if (useNeon) {
      // Production: Neon serverless adapter
      adapter = new PrismaNeon({ connectionString: process.env.NEON_DATABASE_URL! });
    } else {
      // Local development and tests: plain PostgreSQL
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      adapter = new PrismaPg({ connectionString });
    }

    super({
      adapter,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}