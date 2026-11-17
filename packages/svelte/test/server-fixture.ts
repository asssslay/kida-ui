import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))

type Entry = typeof import('./server-entry.js')

export async function withServerEntry<T>(read: (entry: Entry) => T) {
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
    return read((await server.ssrLoadModule('/test/server-entry.ts')) as Entry)
  } finally {
    await server.close()
  }
}

export const serverMarkup = (open = true) => withServerEntry((entry) => entry.serverMarkup(open))
