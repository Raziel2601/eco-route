'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { drivers, trips, user } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getDriverIdentity(requireFirstLoginComplete = true) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== 'driver') throw new Error('Unauthorized')
  const [identity] = await db
    .select({ role: user.role, mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  if (!identity || identity.role !== 'driver') throw new Error('Unauthorized')
  if (requireFirstLoginComplete && identity.mustChangePassword) throw new Error('Password change required')
  return { userId: session.user.id, identity }
}

export async function updateAssignedTripStatus(tripIdValue: string, statusValue: string) {
  const { userId } = await getDriverIdentity()
  const tripId = typeof tripIdValue === 'string' ? tripIdValue.trim() : ''
  if (!tripId || tripId.length > 80) throw new Error('Invalid trip')
  if (!['in_progress', 'paused', 'completed'].includes(statusValue)) throw new Error('Invalid status')

  const [driver] = await db
    .select({ id: drivers.id, userId: drivers.userId })
    .from(drivers)
    .where(eq(drivers.authUserId, userId))
    .limit(1)
  if (!driver) throw new Error('Driver profile not found')

  const progress = statusValue === 'completed' ? 100 : statusValue === 'in_progress' || statusValue === 'paused' ? 50 : 0
  const [updated] = await db
    .update(trips)
    .set({ status: statusValue, progress })
    .where(and(eq(trips.id, tripId), eq(trips.driverId, driver.id), eq(trips.userId, driver.userId)))
    .returning({ id: trips.id })
  if (!updated) throw new Error('Trip not found')
  revalidatePath('/')
}

export async function completeInitialPasswordChange(currentPassword: string, newPassword: string) {
  const { userId, identity } = await getDriverIdentity(false)
  if (!identity.mustChangePassword) throw new Error('Password change is not required')
  if (typeof currentPassword !== 'string' || currentPassword.length < 1 || currentPassword.length > 128) throw new Error('Invalid current password')
  if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) throw new Error('Password must be at least 12 characters')
  if (newPassword === currentPassword) throw new Error('Choose a different password')

  await auth.api.changePassword({
    headers: await headers(),
    body: { currentPassword, newPassword, revokeOtherSessions: true },
  })
  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, userId))
  revalidatePath('/')
  return { success: true }
}
