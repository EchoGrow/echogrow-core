import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // To run migrations: 
    // use DIRECT_URL (Neon) OR DATABASE_URL (Locally)
    url: env('DIRECT_URL') || env('DATABASE_URL'),
  },
});