import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'npm:mammoth': 'mammoth',
      'npm:pdf-parse': 'pdf-parse',
      'node:buffer': 'buffer',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setupTests.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
      all: false,
      include: ['src/**/*.{ts,tsx}', 'supabase/functions/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
