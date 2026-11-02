import { formDeps } from '@/lib/inkwell/form-deps'
import { notificationsForm } from '@/lib/inkwell/forms'

export const dynamic = 'force-dynamic'

// The Notifications page's form (inkwell-console design §4).
export function POST(request: Request): Promise<Response> {
  return notificationsForm(request, formDeps)
}
