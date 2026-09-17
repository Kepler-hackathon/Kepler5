import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@kepler/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@kepler/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@kepler/prompts': path.resolve(__dirname, '../../packages/prompts/src/index.ts'),
      '@kepler/widgets': path.resolve(__dirname, '../../packages/widgets/src/index.ts'),
    },
  },
})
