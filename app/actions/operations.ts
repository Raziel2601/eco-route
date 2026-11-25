'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { drivers, routes, trips, user, vehicles, type RouteWaypoint } from '@/lib/db/schema'
import { getOperationsForUser } from '@/lib/operations-data'
import type { DriverInput, RouteInput, TripInput, VehicleInput } from '@/lib/operations-types'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes, randomUUID } from 'node:crypto'

const driverStatuses = ['available', 'on-route', 'off-duty'] as const
const vehicleStatuses = ['available', 'on-route', 'maintenance'] as const
const tripStatuses = ['planned', 'in_progress', 'paused', 'completed'] as const

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== 'admin') throw new Error('Unauthorized')
  const [identity] = await db.select({ role: user.role, mustChangePassword: user.mustChangePassword }).from(user).where(eq(user.id, session.user.id)).limit(1)
  if (!identity || identity.role !== 'admin' || identity.mustChangePassword) throw new Error('Unauthorized')
  return session.user.id
}

function requiredText(value: unknown, label: string, maxLength = 120) {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`)
  const result = value.trim()
  if (!result || result.length > maxLength) throw new Error(`Invalid ${label}`)
  return result
}

function optionalText(value: unknown, label: string, maxLength = 160) {
  if (value == null || value === '') return null
  return requiredText(value, label, maxLength)
}

function safeId(value: unknown) {
  return requiredText(value, 'id', 80)
}

function coordinate(value: unknown, label: string, min: number, max: number) {
  const result = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(result) || result < min || result > max) throw new Error(`Invalid ${label}`)
  return result
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error(`Invalid ${label}`)
  return value
}

function validateWaypoints(value: unknown): RouteWaypoint[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid waypoints')
  return value.map((point) => {
    if (!point || typeof point !== 'object') throw new Error('Invalid waypoint')
    const candidate = point as Record<string, unknown>
    return {
      id: typeof candidate.id === 'string' && candidate.id.length <= 80 ? candidate.id : randomUUID(),
      label: typeof candidate.label === 'string' ? candidate.label.trim().slice(0, 80) || 'Parada' : 'Parada',
      lat: coordinate(candidate.lat, 'latitude', -90, 90),
      lng: coordinate(candidate.lng, 'longitude', -180, 180),
    }
  })
}

async function assertOwnedRecord(table: typeof routes | typeof drivers | typeof vehicles, id: string, userId: string) {
  const [record] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, id), eq(table.userId, userId))).limit(1)
  if (!record) throw new Error('Record not found')
}

export async function getOperations() {
  const userId = await getUserId()
  return getOperationsForUser(userId)
}

export async function saveDriver(input: DriverInput & { createAccess?: boolean }) {
  const userId = await getUserId()
  const values = {
    name: requiredText(input.name, 'name'),
    email: optionalText(input.email, 'email', 254)?.toLocaleLowerCase() ?? null,
    phone: optionalText(input.phone, 'phone', 40),
    license: optionalText(input.license, 'license', 60),
    status: enumValue(input.status, driverStatuses, 'status'),
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new Error('Invalid email')
  if (input.id) {
    const id = safeId(input.id)
    const [existing] = await db.select().from(drivers).where(and(eq(drivers.id, id), eq(drivers.userId, userId))).limit(1)
    if (!existing) throw new Error('Record not found')
    if (existing.authUserId && values.email !== existing.email) throw new Error('Driver login email cannot be changed here')
    await db.update(drivers).set(values).where(and(eq(drivers.id, id), eq(drivers.userId, userId)))
    revalidatePath('/')
    return null
  }

  if (!input.createAccess) {
    await db.insert(drivers).values({ id: randomUUID(), userId, ...values })
    revalidatePath('/')
    return null
  }

  if (!values.email) throw new Error('A driver email is required to create sign-in access')
  const temporaryPassword = randomBytes(18).toString('base64url')
  const requestHeaders = await headers()
  let authUserId: string | undefined
  try {
    const created = await auth.api.createUser({
      headers: requestHeaders,
      body: { email: values.email, name: values.name, password: temporaryPassword, role: 'driver' },
    })
    authUserId = created.user.id
    await db.transaction(async (tx) => {
      await tx.insert(drivers).values({ id: randomUUID(), userId, authUserId, ...values })
      await tx.update(user).set({ mustChangePassword: true }).where(eq(user.id, authUserId!))
    })
  } catch {
    if (authUserId) {
      try {
        await auth.api.removeUser({ headers: requestHeaders, body: { userId: authUserId } })
      } catch {
        throw new Error('Could not finish driver account creation')
      }
    }
    throw new Error('Could not create driver account')
  }
  revalidatePath('/')
  return { temporaryPassword }
}

export async function saveVehicle(input: VehicleInput) {
  const userId = await getUserId()
  const battery = input.battery == null ? null : Number(input.battery)
  if (battery != null && (!Number.isInteger(battery) || battery < 0 || battery > 100)) throw new Error('Invalid battery')
  const values = {
    code: requiredText(input.code, 'code', 40),
    name: requiredText(input.name, 'name'),
    type: requiredText(input.type, 'type', 50),
    status: enumValue(input.status, vehicleStatuses, 'status'),
    battery,
  }
  if (input.id) {
    const id = safeId(input.id)
    const [updated] = await db.update(vehicles).set(values).where(and(eq(vehicles.id, id), eq(vehicles.userId, userId))).returning({ id: vehicles.id })
    if (!updated) throw new Error('Record not found')
  } else {
    await db.insert(vehicles).values({ id: randomUUID(), userId, ...values })
  }
  revalidatePath('/')
}

export async function saveRoute(input: RouteInput) {
  const userId = await getUserId()
  const values = {
    name: requiredText(input.name, 'name'),
    startAddress: requiredText(input.startAddress, 'start address', 180),
    endAddress: requiredText(input.endAddress, 'end address', 180),
    startLat: coordinate(input.startLat, 'start latitude', -90, 90),
    startLng: coordinate(input.startLng, 'start longitude', -180, 180),
    endLat: coordinate(input.endLat, 'end latitude', -90, 90),
    endLng: coordinate(input.endLng, 'end longitude', -180, 180),
    waypoints: validateWaypoints(input.waypoints),
  }
  if (input.id) {
    const id = safeId(input.id)
    const [updated] = await db.update(routes).set(values).where(and(eq(routes.id, id), eq(routes.userId, userId))).returning({ id: routes.id })
    if (!updated) throw new Error('Record not found')
  } else {
    await db.insert(routes).values({ id: randomUUID(), userId, ...values })
  }
  revalidatePath('/')
}

export async function saveTrip(input: TripInput) {
  const userId = await getUserId()
  const routeId = safeId(input.routeId)
  await assertOwnedRecord(routes, routeId, userId)
  const driverId = input.driverId ? safeId(input.driverId) : null
  const vehicleId = input.vehicleId ? safeId(input.vehicleId) : null
  if (driverId) await assertOwnedRecord(drivers, driverId, userId)
  if (vehicleId) await assertOwnedRecord(vehicles, vehicleId, userId)
  const status = enumValue(input.status, tripStatuses, 'status')
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid scheduled date')
  const progress = status === 'completed' ? 100 : status === 'in_progress' || status === 'paused' ? 50 : 0
  const values = { routeId, driverId, vehicleId, status, scheduledAt, progress }
  if (input.id) {
    const id = safeId(input.id)
    const [updated] = await db.update(trips).set(values).where(and(eq(trips.id, id), eq(trips.userId, userId))).returning({ id: trips.id })
    if (!updated) throw new Error('Record not found')
  } else {
    await db.insert(trips).values({ id: randomUUID(), userId, ...values })
  }
  revalidatePath('/')
}

export async function updateTripStatus(idValue: string, statusValue: string) {
  const userId = await getUserId()
  const id = safeId(idValue)
  const status = enumValue(statusValue, tripStatuses, 'status')
  const progress = status === 'completed' ? 100 : status === 'in_progress' || status === 'paused' ? 50 : 0
  const [updated] = await db.update(trips).set({ status, progress }).where(and(eq(trips.id, id), eq(trips.userId, userId))).returning({ id: trips.id })
  if (!updated) throw new Error('Record not found')
  revalidatePath('/')
}

export async function deleteRecord(kind: 'driver' | 'vehicle' | 'route' | 'trip', idValue: string) {
  const userId = await getUserId()
  const id = safeId(idValue)
  if (kind === 'driver') {
    const [driver] = await db.select({ authUserId: drivers.authUserId }).from(drivers).where(and(eq(drivers.id, id), eq(drivers.userId, userId))).limit(1)
    if (driver?.authUserId) await auth.api.removeUser({ headers: await headers(), body: { userId: driver.authUserId } })
    await db.transaction(async (tx) => {
      await tx.update(trips).set({ driverId: null }).where(and(eq(trips.driverId, id), eq(trips.userId, userId)))
      await tx.delete(drivers).where(and(eq(drivers.id, id), eq(drivers.userId, userId)))
    })
  } else if (kind === 'vehicle') {
    await db.transaction(async (tx) => {
      await tx.update(trips).set({ vehicleId: null }).where(and(eq(trips.vehicleId, id), eq(trips.userId, userId)))
      await tx.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
    })
  } else if (kind === 'route') {
    await db.transaction(async (tx) => {
      await tx.delete(trips).where(and(eq(trips.routeId, id), eq(trips.userId, userId)))
      await tx.delete(routes).where(and(eq(routes.id, id), eq(routes.userId, userId)))
    })
  } else {
    await db.delete(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)))
  }
  revalidatePath('/')
}
