import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Renders the real server build through Vite, as a SvelteKit or Vite SSR host would. */
export async function serverMarkup() {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    plugins: [svelte({ configFile: false })],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    ssr: { noExternal: ['@kida-ui/svelte'] },
  })
  try {
    const entry = await server.ssrLoadModule('/test/server-entry.ts')
    return entry.serverMarkup() as string
  } finally {
    await server.close()
  }
}
