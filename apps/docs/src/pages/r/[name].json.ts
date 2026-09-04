import type { APIRoute, GetStaticPaths } from 'astro'
import { getRegistryItems, type RegistryItem } from '../../lib/registry'

export const prerender = true

export const getStaticPaths = (() =>
  getRegistryItems().map((item) => ({
    params: { name: item.name },
    props: { item },
  }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(`${JSON.stringify(props.item as RegistryItem, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
