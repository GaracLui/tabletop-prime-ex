import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/engine/**/*.ts',
        'src/lib/event-code.ts',
        'src/lib/schedule.ts',
        'src/lib/format.ts',
        'src/lib/schedule-utils.ts',
        'src/lib/bgg.ts',
      ],
    },
  },
})
