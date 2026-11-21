import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env.test'), override: true });

const { DATABASE_URL = '', DIRECT_URL = '', NEON_DATABASE_URL, REDIS_URL } = process.env;
const isLocal = (url: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const isTestDb = (url: string) => /\/[^/?]*_test(\?|$)/.test(url);

if (
  !isLocal(DATABASE_URL) || !isTestDb(DATABASE_URL) ||
  (DIRECT_URL && (!isLocal(DIRECT_URL) || !isTestDb(DIRECT_URL))) ||
  NEON_DATABASE_URL || REDIS_URL
) {
  throw new Error(
    'E2E refused to run: these tests DELETE all rows. DATABASE_URL must be a LOCAL database ' +
      'whose name ends with "_test", and NEON_DATABASE_URL / REDIS_URL must be empty. See apps/api/.env.test.',
  );
}