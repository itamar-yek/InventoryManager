/**
 * Vitest configuration for frontend testing.
 *
 * Configures the test environment with jsdom for React component testing,
 * sets up test globals, and configures coverage reporting.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Enable global test functions (describe, it, expect)
    globals: true,

    // Setup file for test utilities
    setupFiles: ['./src/__tests__/setup.ts'],

    // Include test patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/setup.ts',
      ],
    },
  },
});
