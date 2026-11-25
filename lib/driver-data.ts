import 'server-only'

import { db } from '@/lib/db'
import { drivers, routes, trips, vehicles } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'

export type DriverTrip = {
  id: string
  routeName: string
  startAddress: string
  endAddress: string
  vehicleName: string | null
  scheduledAt: string | null
  status: string
  progress: number
}

export type DriverPortalData = {
  driverName: string
  trips: DriverTrip[]
}

export async function getDriverPortalData(authUserId: string): Promise<DriverPortalData | null> {
  const [driver] = await db
    .select({ id: drivers.id, userId: drivers.userId, name: drivers.name })
    .from(drivers)
    .where(eq(drivers.authUserId, authUserId))
    .limit(1)

  if (!driver) return null

  const assignedTrips = await db
    .select({
      id: trips.id,
      routeName: routes.name,
      startAddress: routes.startAddress,
      endAddress: routes.endAddress,
      vehicleCode: vehicles.code,
      vehicleModel: vehicles.name,
      scheduledAt: trips.scheduledAt,
      status: trips.status,
      progress: trips.progress,
    })
    .from(trips)
    .innerJoin(routes, eq(trips.routeId, routes.id))
    .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
    .where(and(eq(trips.driverId, driver.id), eq(trips.userId, driver.userId)))
    .orderBy(desc(trips.createdAt))

  return {
    driverName: driver.name,
    trips: assignedTrips.map((trip) => ({
      id: trip.id,
      routeName: trip.routeName,
      startAddress: trip.startAddress,
      endAddress: trip.endAddress,
      vehicleName: trip.vehicleCode && trip.vehicleModel ? `${trip.vehicleCode} · ${trip.vehicleModel}` : null,
      scheduledAt: trip.scheduledAt?.toISOString() ?? null,
      status: trip.status,
      progress: trip.progress,
    })),
  }
}
