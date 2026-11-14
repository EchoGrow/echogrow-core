import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    let adapter;

    // إذا كان NEON_DATABASE_URL موجوداً، استخدم Neon (الإنتاج)
    if (process.env.NEON_DATABASE_URL) {
      adapter = new PrismaNeon({ connectionString: process.env.NEON_DATABASE_URL });
    } else {
      // وإلا، استخدم PostgreSQL المحلي (التطوير)
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      adapter = new PrismaPg({ connectionString });
    }

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}