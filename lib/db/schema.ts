import { boolean, integer, jsonb, pgTable, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core'

export type RouteWaypoint = { id: string; label: string; lat: number; lng: number }

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('admin'),
  mustChangePassword: boolean('mustChangePassword').notNull().default(false),
  banned: boolean('banned').notNull().default(false),
  banReason: text('banReason'),
  banExpires: timestamp('banExpires'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
  impersonatedBy: text('impersonatedBy'),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const drivers = pgTable('drivers', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  authUserId: text('authUserId').unique(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  license: text('license'),
  status: text('status').notNull().default('available'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('Van'),
  status: text('status').notNull().default('available'),
  battery: integer('battery'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const routes = pgTable('routes', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  startAddress: text('startAddress').notNull(),
  endAddress: text('endAddress').notNull(),
  startLat: doublePrecision('startLat').notNull(),
  startLng: doublePrecision('startLng').notNull(),
  endLat: doublePrecision('endLat').notNull(),
  endLng: doublePrecision('endLng').notNull(),
  waypoints: jsonb('waypoints').$type<RouteWaypoint[]>().notNull().default([]),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  routeId: text('routeId').notNull(),
  driverId: text('driverId'),
  vehicleId: text('vehicleId'),
  status: text('status').notNull().default('planned'),
  scheduledAt: timestamp('scheduledAt'),
  progress: integer('progress').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
