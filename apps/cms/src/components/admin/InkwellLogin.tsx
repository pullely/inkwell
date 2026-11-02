import type { AdminViewServerProps } from 'payload'
import { redirect } from 'next/navigation'

import { safeAdminRedirect } from '../../lib/inkwell/cookies'
import { inkwellPublicApiUrl } from '../../lib/inkwell/transport'
import { Logo } from './Brand'
import { InkwellSignIn } from './InkwellSignIn'

const first = (value: string | string[] | undefined): string | null => (typeof value === 'string' ? value : null)

// The admin's login view, replaced (design §1): Payload's local strategy is
// off, so its own view would render no form.
export async function InkwellLogin({ initPageResult, searchParams }: AdminViewServerProps) {
  const target = safeAdminRedirect(first(searchParams?.redirect))
  if (initPageResult.req.user) redirect(target)
  return (
    <>
      <div style={{ marginBottom: 'calc(var(--base) * 1.5)' }}>
        <Logo />
      </div>
      <InkwellSignIn
        apiUrl={inkwellPublicApiUrl()}
        redirect={target}
        error={first(searchParams?.error)}
        signedOut={first(searchParams?.signedOut) === '1'}
        productName="Inkwell"
      />
    </>
  )
}
