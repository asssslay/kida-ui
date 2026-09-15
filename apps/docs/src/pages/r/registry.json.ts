import type { APIRoute } from 'astro'
import registry from '../../../../../registry/registry.json'

export const prerender = true

export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(registry, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
