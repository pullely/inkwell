import type { AuthUser, ProfileResponse, UpdateProfileRequest } from '@saas/contracts/auth'
import type { ListOrganizationsResponse, PublicOrganization } from '@saas/contracts/membership'
import type {
  GetNotificationPreferencesResponse,
  NotificationCategoryPreferences,
  NotificationPreference,
  UpdateNotificationPreferencesResponse,
} from '@saas/contracts/notifications'
import type { PublicSecurityEvent, SecurityEventListResponse } from '@saas/contracts/security-events'

import { inkwellCall, type InkwellResult, type InkwellTransport } from './client'

// The Inkwell calls behind the account pages (inkwell-console design §4),
// made by the CMS server with the signed-in person's session token. Each is
// the same api-edge route the console calls; Solo mode decides what exists.

export type Failure = Extract<InkwellResult<never>, { ok: false }>
export type Outcome<T> = { ok: true; value: T } | Failure

// Comparisons with `=== false`, not `!ok`: the CMS compiles without
// strictNullChecks, where only an equality check narrows the union.
function unwrap<T, R>(result: InkwellResult<T>, pick: (data: T) => R): Outcome<R> {
  if (result.ok === false) return result
  return { ok: true, value: pick(result.data) }
}

export async function getProfile(transport: InkwellTransport, token: string): Promise<Outcome<AuthUser>> {
  return unwrap(await inkwellCall<ProfileResponse>(transport, '/v1/auth/profile', { token }), (d) => d.user)
}

export async function updateProfile(
  transport: InkwellTransport,
  token: string,
  patch: UpdateProfileRequest,
): Promise<Outcome<AuthUser>> {
  return unwrap(await inkwellCall<ProfileResponse>(transport, '/v1/auth/profile', { token, method: 'PATCH', body: patch }), (d) => d.user)
}

export type SecurityPage = { events: PublicSecurityEvent[]; nextCursor: string | null }

/** One page of the person's own security events; `cursor` is api-edge's, passed back as given. */
export async function listSecurityEvents(
  transport: InkwellTransport,
  token: string,
  cursor?: string | null,
): Promise<Outcome<SecurityPage>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const result = await inkwellCall<SecurityEventListResponse>(transport, `/v1/auth/security-events${query}`, { token })
  if (result.ok === false) return result
  return { ok: true, value: { events: result.data?.securityEvents ?? [], nextCursor: result.cursor } }
}

export async function listOrganizations(transport: InkwellTransport, token: string): Promise<Outcome<PublicOrganization[]>> {
  return unwrap(await inkwellCall<ListOrganizationsResponse>(transport, '/v1/organizations', { token }), (d) => d?.organizations ?? [])
}

/** The organization a page is about: the one asked for if the person belongs to it, else their first (Solo: their only one). */
export function pickOrganization(orgs: PublicOrganization[], wanted?: string | null): PublicOrganization | null {
  return (wanted ? orgs.find((o) => o.id === wanted) : undefined) ?? orgs[0] ?? null
}

export async function getPreferences(
  transport: InkwellTransport,
  token: string,
  orgId: string,
): Promise<Outcome<NotificationPreference[]>> {
  const path = `/v1/notifications/preferences?orgId=${encodeURIComponent(orgId)}`
  return unwrap(await inkwellCall<GetNotificationPreferencesResponse>(transport, path, { token }), (d) => d?.preferences ?? [])
}

export async function updatePreferences(
  transport: InkwellTransport,
  token: string,
  input: { orgId: string; userId: string; categories: NotificationCategoryPreferences },
): Promise<Outcome<NotificationPreference>> {
  const body = { orgId: input.orgId, subjectKind: 'user', subjectId: input.userId, channel: 'email', categories: input.categories }
  return unwrap(
    await inkwellCall<UpdateNotificationPreferencesResponse>(transport, '/v1/notifications/preferences', { token, method: 'PUT', body }),
    (d) => d.preference,
  )
}
