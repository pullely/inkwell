import type { AdminViewServerProps } from 'payload'

import { listOrganizations } from '@/lib/inkwell/account-api'
import { formatSecurityTimestamp } from '@/lib/inkwell/models/security-events'
import { inkwellTransport } from '@/lib/inkwell/transport'

import { AccountHeading, AccountTemplate, card, LoadError, requireStaff, row } from './AccountPage'

// Organization (design §4): the Inkwell organization the account works in. In
// Solo mode that is the one personal organization Inkwell made at sign-up.
// Renaming is not in the API, so the page only reads.
export async function OrganizationView(props: AdminViewServerProps) {
  const token = requireStaff(props, '/admin/organization')
  const result = await listOrganizations(await inkwellTransport(), token)
  return (
    <AccountTemplate props={props}>
      <div data-testid="inkwell-organization">
        <AccountHeading title="Organization" description="The Inkwell organization your account belongs to." />
        {result.ok === false ? (
          <LoadError code={result.code} />
        ) : result.value.length === 0 ? (
          <p>Your account does not belong to an organization yet.</p>
        ) : (
          result.value.map((org) => (
            <section key={org.id} style={card} data-testid="organization">
              <h2 style={{ marginTop: 0 }}>{org.name}</h2>
              <dl style={row}>
                <dt>Slug</dt>
                <dd>
                  <code>{org.slug}</code>
                </dd>
                <dt>ID</dt>
                <dd>
                  <code>{org.id}</code>
                </dd>
                <dt>Created</dt>
                <dd>{formatSecurityTimestamp(org.createdAt)}</dd>
                {org.status ? (
                  <>
                    <dt>Status</dt>
                    <dd>{org.status}</dd>
                  </>
                ) : null}
              </dl>
              <p style={{ marginBottom: 0 }}>
                <a href={`/admin/organization/notifications?org=${encodeURIComponent(org.id)}`}>Notification settings</a>
              </p>
            </section>
          ))
        )}
      </div>
    </AccountTemplate>
  )
}
