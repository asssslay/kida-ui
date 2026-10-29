import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['test/**/*.ssr.test.ts', 'test/**/*.node.test.ts'], environment: 'node' },
})
