'use client'

import { useEffect, useRef } from 'react'

// The admin's logout view, replaced: the nav's log-out link lands here, and
// this posts to /auth/inkwell/logout, which revokes the Inkwell session.
export function InkwellSignOut() {
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    form.current?.submit()
  }, [])
  return (
    <form ref={form} method="post" action="/auth/inkwell/logout">
      <p>Signing you out…</p>
      <button type="submit" className="btn btn--style-secondary btn--size-medium">
        Sign out
      </button>
    </form>
  )
}
