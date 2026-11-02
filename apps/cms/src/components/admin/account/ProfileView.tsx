import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

import { getProfile } from '@/lib/inkwell/account-api'
import { DISPLAY_NAME_MAX } from '@/lib/inkwell/models/profile'
import { inkwellTransport } from '@/lib/inkwell/transport'

import { AccountHeading, card, LoadError, requireStaff, row, StatusLine } from './AccountPage'

// Payload's account view, replaced (design §4): the person's Inkwell profile.
// Payload puts this view in its default template and keeps pending accounts
// out of it, as for any admin page; the gutter is the view's own.
export async function ProfileView(props: AdminViewServerProps) {
  const token = requireStaff(props, '/admin/account')
  const result = await getProfile(await inkwellTransport(), token)
  const role = (props.initPageResult.req.user as { role?: string | null } | null)?.role
  return (
    <Gutter>
      <div data-testid="inkwell-profile">
        <AccountHeading title="Profile" description="Your Inkwell account. It is how you sign in to the CMS." />
        <StatusLine props={props} />
        {result.ok === false ? (
          <LoadError code={result.code} />
        ) : (
          <>
            <section style={card}>
              <dl style={row}>
                <dt>Email</dt>
                <dd data-testid="profile-email">{result.value.email}</dd>
                <dt>CMS role</dt>
                <dd>{role ?? 'none'}</dd>
                <dt>Inkwell user ID</dt>
                <dd>
                  <code>{result.value.id}</code>
                </dd>
              </dl>
            </section>
            <form method="post" action="/inkwell/profile" style={card}>
              <label htmlFor="displayName" style={{ display: 'block', fontWeight: 600, marginBottom: 'calc(var(--base) / 2)' }}>
                Display name
              </label>
              <p style={{ color: 'var(--theme-elevation-500)', marginTop: 0 }}>
                Shown in the CMS and in email Inkwell sends you. Leave it empty to use your email.
              </p>
              <input
                id="displayName"
                name="displayName"
                type="text"
                defaultValue={result.value.displayName ?? ''}
                maxLength={DISPLAY_NAME_MAX}
                autoComplete="name"
                style={{ width: '100%', maxWidth: 420, padding: 'calc(var(--base) / 2)', marginBottom: 'var(--base)' }}
              />
              <div>
                <button type="submit" className="btn btn--style-primary btn--size-medium">
                  Save
                </button>
              </div>
            </form>
          </>
        )}
        <section style={card}>
          <p style={{ marginTop: 0 }}>
            See where and when your account signed in on the <a href="/admin/account/security">Security activity</a> page.
          </p>
          <form method="post" action="/auth/inkwell/logout">
            <button type="submit" className="btn btn--style-secondary btn--size-medium">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </Gutter>
  )
}
