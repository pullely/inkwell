import type { ReactNode } from 'react'

export const metadata = { title: 'Inkwell' }

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>{children}</body>
    </html>
  )
}
