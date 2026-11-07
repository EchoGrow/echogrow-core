import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: [
      'src/**/*.spec.ts',
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    testTimeout: 300_000,   // 5 minutes (LLM can be slow, especially on 503 retries)
    hookTimeout: 60_000,    // 1 minute

    // Vitest 4+/5: poolOptions was removed. Use these top-level options.
    pool: 'forks',
    fileParallelism: false,  // run spec files one after another
    maxWorkers: 1,           // single worker -> no BullMQ/DB collisions
    sequence: { concurrent: false },
  },
  plugins: [tsconfigPaths(), swc.vite()],
});