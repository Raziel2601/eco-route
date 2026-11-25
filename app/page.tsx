import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getDriverPortalData } from '@/lib/driver-data'
import { getOperationsForUser } from '@/lib/operations-data'
import { DriverPortal } from '@/components/driver-portal'
import { EcoRouteApp } from '@/components/eco-route-app'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [identity] = await db
    .select({ role: user.role, mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  if (!identity) redirect('/sign-in')
  if (identity.mustChangePassword) redirect('/change-password')

  if (identity.role === 'driver') {
    const driverData = await getDriverPortalData(session.user.id)
    if (!driverData) notFound()
    return <DriverPortal data={driverData} />
  }
  if (identity.role !== 'admin') notFound()

  const initialData = await getOperationsForUser(session.user.id)
  return <EcoRouteApp initialData={initialData} user={{ id: session.user.id, name: session.user.name, email: session.user.email }} />
}
