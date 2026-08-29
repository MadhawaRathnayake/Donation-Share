import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Each test file sets its own environment variables before importing the
    // module under test, so files must not share a process-wide env.
    isolate: true,
  },
});
