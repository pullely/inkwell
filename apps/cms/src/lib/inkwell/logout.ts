import { inkwellCall, type InkwellTransport } from './client'
import { clearedSessionCookie, INKWELL_SESSION_COOKIE, readCookie } from './cookies'
import { forgetSession } from './session'

/**
 * End a Inkwell session: revoke it at api-edge (POST /v1/auth/logout), forget it
 * here, and return the Set-Cookie that removes it from the browser. A failed
 * revoke still clears the cookie: the person asked to leave.
 */
export async function endSession(
  transport: InkwellTransport,
  headers: Headers,
  secure: boolean,
): Promise<{ revoked: boolean; setCookie: string }> {
  const token = readCookie(headers, INKWELL_SESSION_COOKIE)
  let revoked = false
  if (token) {
    const result = await inkwellCall(transport, '/v1/auth/logout', { token, method: 'POST' })
    revoked = result.ok || result.status === 401
    await forgetSession(token)
  }
  return { revoked, setCookie: clearedSessionCookie(secure) }
}
