/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Scope coverage to the pure domain logic that unit tests target. The
      // Supabase client factories and the Gemini SDK network path are covered
      // by the integration tests and Playwright E2E suite instead.
      include: [
        'lib/carbon/**',
        'lib/karma/**',
        'lib/streak/**',
        'lib/insights/**',
        'lib/validators/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
