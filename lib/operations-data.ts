import 'server-only'

import { db } from '@/lib/db'
import { drivers, routes, trips, vehicles } from '@/lib/db/schema'
import type { OperationsData } from '@/lib/operations-types'
import { eq } from 'drizzle-orm'

export async function getOperationsForUser(userId: string): Promise<OperationsData> {
  const [driverRows, vehicleRows, routeRows, tripRows] = await Promise.all([
    db.select().from(drivers).where(eq(drivers.userId, userId)).orderBy(drivers.createdAt),
    db.select().from(vehicles).where(eq(vehicles.userId, userId)).orderBy(vehicles.createdAt),
    db.select().from(routes).where(eq(routes.userId, userId)).orderBy(routes.createdAt),
    db.select().from(trips).where(eq(trips.userId, userId)).orderBy(trips.createdAt),
  ])

  return {
    drivers: driverRows.map((driver) => ({ ...driver, createdAt: driver.createdAt.toISOString() })),
    vehicles: vehicleRows.map((vehicle) => ({ ...vehicle, createdAt: vehicle.createdAt.toISOString() })),
    routes: routeRows.map((route) => ({ ...route, createdAt: route.createdAt.toISOString() })),
    trips: tripRows.map((trip) => ({
      ...trip,
      scheduledAt: trip.scheduledAt?.toISOString() ?? null,
      createdAt: trip.createdAt.toISOString(),
    })),
  }
}
