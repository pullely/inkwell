import { formDeps } from '@/lib/inkwell/form-deps'
import { profileForm } from '@/lib/inkwell/forms'

export const dynamic = 'force-dynamic'

// The Profile page's form (inkwell-console design §4).
export function POST(request: Request): Promise<Response> {
  return profileForm(request, formDeps)
}
