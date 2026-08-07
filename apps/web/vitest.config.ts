import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/*.test.ts', 'test_api/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.test-output/**',
      'lib/karaoke/timeline.test.ts',
      'lib/narration/pipeline.test.ts',
      'lib/supabase/middleware.test.ts',
      'test_api/live_flow.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './empty-mock.ts'),
    },
  },
});
