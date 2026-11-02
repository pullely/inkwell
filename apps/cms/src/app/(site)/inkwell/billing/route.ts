import { formDeps } from '@/lib/inkwell/form-deps'
import { billingForm } from '@/lib/inkwell/forms'

export const dynamic = 'force-dynamic'

// The Billing & plan page's forms (inkwell-console design §4).
export function POST(request: Request): Promise<Response> {
  return billingForm(request, formDeps)
}
