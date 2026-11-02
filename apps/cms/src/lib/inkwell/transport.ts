import { getCloudflareContext } from '@opennextjs/cloudflare'

import { isWorkersRuntime } from '../runtime'
import type { InkwellTransport } from './client'

// How the CMS server reaches api-edge. On Workers, the INKWELL_API service
// binding: the call stays inside Cloudflare and api-edge authenticates it by
// its bearer token like any other client. Off Workers (local `next dev`, a
// local `wrangler dev` without the binding), INKWELL_API_URL.
export async function inkwellTransport(): Promise<InkwellTransport> {
  if (isWorkersRuntime()) {
    const { env } = await getCloudflareContext({ async: true })
    const binding = (env as { INKWELL_API?: { fetch(url: string, init?: RequestInit): Promise<Response> } }).INKWELL_API
    if (binding) return (path, init) => binding.fetch(`https://inkwell-api${path}`, init)
  }
  const base = process.env.INKWELL_API_URL
  if (!base) {
    return async () => {
      throw new Error('The CMS has no way to reach Inkwell: the INKWELL_API binding (or INKWELL_API_URL) is missing.')
    }
  }
  return (path, init) => fetch(`${base.replace(/\/+$/, '')}${path}`, init)
}

/** The api-edge URL the browser calls for sign-in (a Worker var; not a secret). */
export function inkwellPublicApiUrl(): string {
  return (process.env.INKWELL_API_PUBLIC_URL ?? process.env.INKWELL_API_URL ?? '').replace(/\/+$/, '')
}
