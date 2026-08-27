import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Point at package SOURCE, not dist. Editing the engine hot-reloads the page with no
    // rebuild step — which is the whole reason this app exists.
    alias: {
      '@kida-ui/motion': src('../../packages/motion/src/index.ts'),
      '@kida-ui/react': src('../../packages/react/src/index.ts'),
    },
  },
})
