import type { Account, AccountStore } from '@cms/lib/inkwell/accounts'
import type { InkwellTransport } from '@cms/lib/inkwell/client'
import { INKWELL_SESSION_COOKIE } from '@cms/lib/inkwell/cookies'
import { endSession } from '@cms/lib/inkwell/logout'
import { clearSessionCache } from '@cms/lib/inkwell/session'
import { inkwellAuthenticate } from '@cms/lib/inkwell/strategy'
import { SETUP_COOKIE } from '@cms/lib/setup-gate'

// The only way into the admin (design §2): a live Inkwell session in the
// inkwell_session cookie, mapped to a users row.

const SETUP = 'owner-setup-token-0123456789'
const user = { id: 'usr_ed', email: 'ed@example.com', displayName: 'Ed' }

function deps(answer: number = 200) {
  const calls: string[] = []
  const transport: InkwellTransport = async (path, init) => {
    calls.push(`${init.method ?? 'GET'} ${path} ${new Headers(init.headers).get('authorization')}`)
    if (answer !== 200) return new Response(JSON.stringify({ error: { code: 'unauthenticated' } }), { status: answer })
    return new Response(JSON.stringify({ data: { session: { id: 's', expiresAt: '2026-12-01T00:00:00Z' }, user } }))
  }
  const rows: Account[] = []
  const store: AccountStore = {
    findByInkwellId: async (id) => rows.find((r) => r.inkwellUserId === id) ?? null,
    findUnlinkedByEmail: async () => null,
    adminExists: async () => rows.some((r) => r.role === 'admin'),
    create: async (data) => {
      const row = { id: `u${rows.length + 1}`, ...data }
      rows.push(row)
      return row
    },
    update: async (id, data) => Object.assign(rows.find((r) => r.id === id)!, data),
  }
  const authenticate = inkwellAuthenticate({ transport: async () => transport, store: () => store, setupToken: () => SETUP })
  const run = (headers: Record<string, string>) => authenticate({ headers: new Headers(headers), payload: {} as never })
  return { run, calls, rows, transport }
}

beforeEach(() => clearSessionCache())

describe('inkwell auth strategy', () => {
  it('signs nobody in without the cookie, and asks api-edge nothing', async () => {
    const d = deps()
    await expect(d.run({})).resolves.toEqual({ user: null })
    expect(d.calls).toHaveLength(0)
  })

  it('signs in a live session as its users row, marked as this strategy', async () => {
    const d = deps()
    const { user: signedIn } = (await d.run({ cookie: `${INKWELL_SESSION_COOKIE}=tok` })) as { user: Record<string, unknown> }
    expect(signedIn).toMatchObject({ id: 'u1', email: 'ed@example.com', inkwellUserId: 'usr_ed', collection: 'users', _strategy: 'inkwell', role: null })
    expect(d.calls).toEqual(['GET /v1/auth/session Bearer tok'])
  })

  it('never puts the Inkwell token on the user (Payload sends req.user to the browser)', async () => {
    const d = deps()
    const result = await d.run({ cookie: `${INKWELL_SESSION_COOKIE}=sps_ses_secret.value` })
    expect(JSON.stringify(result)).not.toContain('sps_ses_secret')
  })

  it('signs nobody in for a dead session', async () => {
    const d = deps(401)
    await expect(d.run({ cookie: `${INKWELL_SESSION_COOKIE}=tok` })).resolves.toEqual({ user: null })
    expect(d.rows).toHaveLength(0)
  })

  it('ignores background requests from another site', async () => {
    const d = deps()
    await expect(
      d.run({ cookie: `${INKWELL_SESSION_COOKIE}=tok`, 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' }),
    ).resolves.toEqual({ user: null })
    expect(d.calls).toHaveLength(0)
  })

  it('ignores writes another origin sends with the cookie, a sibling Worker on the same site included', async () => {
    const d = deps()
    const host = 'inkwell-cms-stage.rahulvarghesepullely.workers.dev'
    const cookie = `${INKWELL_SESSION_COOKIE}=tok`
    await expect(
      d.run({ cookie, host, origin: 'https://inkwell-web-console-next-stage.rahulvarghesepullely.workers.dev', 'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'navigate' }),
    ).resolves.toEqual({ user: null })
    expect(d.calls).toHaveLength(0)
    const own = (await d.run({ cookie, host, origin: `https://${host}`, 'sec-fetch-site': 'same-origin' })) as { user: unknown }
    expect(own.user).not.toBeNull()
  })

  it('makes the first admin only with the setup cookie', async () => {
    const d = deps()
    const first = (await d.run({ cookie: `${INKWELL_SESSION_COOKIE}=tok; ${SETUP_COOKIE}=${SETUP}x` })) as unknown as { user: { role: unknown } }
    expect(first.user.role).toBeNull()
    clearSessionCache()
    const again = (await d.run({ cookie: `${INKWELL_SESSION_COOKIE}=tok; ${SETUP_COOKIE}=${SETUP}` })) as unknown as { user: { role: unknown } }
    expect(again.user.role).toBe('admin')
  })
})

describe('endSession (sign-out)', () => {
  it('revokes the session at api-edge and clears the cookie', async () => {
    const d = deps()
    const result = await endSession(d.transport, new Headers({ cookie: `${INKWELL_SESSION_COOKIE}=tok` }), true)
    expect(d.calls).toEqual(['POST /v1/auth/logout Bearer tok'])
    expect(result.revoked).toBe(true)
    expect(result.setCookie).toContain('Max-Age=0')
  })

  it('still clears the cookie when there is no session', async () => {
    const d = deps()
    const result = await endSession(d.transport, new Headers(), false)
    expect(d.calls).toHaveLength(0)
    expect(result.setCookie).toContain(`${INKWELL_SESSION_COOKIE}=;`)
  })
})
