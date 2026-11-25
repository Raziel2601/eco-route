import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOperationsForUser } from '@/lib/operations-data'
import { EcoRouteApp } from '@/components/eco-route-app'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const initialData = await getOperationsForUser(session.user.id)
  return <EcoRouteApp initialData={initialData} user={{ id: session.user.id, name: session.user.name, email: session.user.email }} />
}
