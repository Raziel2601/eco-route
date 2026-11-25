import type { RouteWaypoint } from '@/lib/db/schema'
export type { RouteWaypoint } from '@/lib/db/schema'

export type Driver = {
  id: string
  name: string
  email: string | null
  phone: string | null
  license: string | null
  status: string
  createdAt: string
}

export type Vehicle = {
  id: string
  code: string
  name: string
  type: string
  status: string
  battery: number | null
  createdAt: string
}

export type Route = {
  id: string
  name: string
  startAddress: string
  endAddress: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  waypoints: RouteWaypoint[]
  createdAt: string
}

export type Trip = {
  id: string
  routeId: string
  driverId: string | null
  vehicleId: string | null
  status: string
  scheduledAt: string | null
  progress: number
  createdAt: string
}

export type OperationsData = {
  drivers: Driver[]
  vehicles: Vehicle[]
  routes: Route[]
  trips: Trip[]
}

export type DriverInput = Omit<Driver, 'createdAt' | 'id'> & { id?: string }
export type VehicleInput = Omit<Vehicle, 'createdAt' | 'id'> & { id?: string }
export type RouteInput = Omit<Route, 'createdAt' | 'id'> & { id?: string }
export type TripInput = Omit<Trip, 'createdAt' | 'id' | 'progress'> & { id?: string }
