import type { CollectionAfterLogoutHook, CollectionConfig } from 'payload'

import { adminOrSelf, isAdmin, isAdminField, isStaff, selfOrAdmin } from '../lib/access'
import { inkwellStrategy } from '../lib/inkwell/strategy'

// Sign-out from Payload's own endpoint (/api/users/logout, which the admin
// calls on inactivity) ends the Inkwell session too, so the cookie cannot sign
// the person straight back in.
const endInkwellSession: CollectionAfterLogoutHook = async ({ req }) => {
  const [{ inkwellTransport }, { endSession }] = await Promise.all([import('../lib/inkwell/transport'), import('../lib/inkwell/logout')])
  const secure = new URL(req.url ?? 'https://cms.invalid').protocol === 'https:'
  const { setCookie } = await endSession(await inkwellTransport(), req.headers, secure)
  req.responseHeaders ??= new Headers()
  req.responseHeaders.append('set-cookie', setCookie)
}

// Staff accounts (inkwell-console design §3). People sign in with their
// Inkwell account; there are no Payload passwords. A row is created on first
// sign-in and linked by inkwellUserId. No role means pending: signed in but not
// let into the admin. An admin can also add a row by email beforehand, with a
// role, as an invitation: it is linked when that email signs in.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // enableFields keeps the auth columns (email, sessions, ...) so the
    // schema stays as migration 200 made it; only the password flows go.
    disableLocalStrategy: { enableFields: true },
    strategies: [inkwellStrategy],
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'role', 'inkwellUserId'] },
  access: {
    admin: isStaff,
    read: selfOrAdmin,
    create: isAdmin,
    update: adminOrSelf,
    delete: isAdmin,
  },
  hooks: { afterLogout: [endInkwellSession] },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      admin: { description: 'Empty means pending: signed in with Inkwell, but not let into the admin yet.' },
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'inkwellUserId',
      label: 'Inkwell user',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Set on first Inkwell sign-in.' },
      access: { create: () => false, update: () => false },
    },
  ],
}
