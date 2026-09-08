import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    // Files share one test database and resetDatabase truncates globally
    fileParallelism: false,
    exclude: ['**/node_modules/**', '**/tmp/**'],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/client/**', '**/*.test.ts', '**/*.spec.ts'],
    },
    globalSetup: './test/setup/global-setup.ts',
    setupFiles: ['./test/setup/bun-compat.ts', './test/setup/msw-setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    fsModuleCache: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
})
