'use client'

import { useState } from 'react'
import { CalendarDays, Pencil } from 'lucide-react'
import { updateTripStatus } from '@/app/actions/operations'
import type { OperationsData, Trip } from '@/lib/operations-types'

const statusLabel: Record<string, string> = {
  planned: 'Programado',
  in_progress: 'En curso',
  paused: 'En pausa',
  completed: 'Completado',
}
const statusTone: Record<string, string> = {
  planned: 'blue',
  in_progress: 'green',
  paused: 'amber',
  completed: 'muted',
}

type Props = {
  data: OperationsData
  trips?: Trip[]
  onEdit: (trip: Trip) => void
  onRefresh: () => Promise<void>
}

export function TripsTable({ data, trips = data.trips, onEdit, onRefresh }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const driverName = (id: string | null) => data.drivers.find((driver) => driver.id === id)?.name ?? 'Sin asignar'
  const vehicleName = (id: string | null) => {
    const vehicle = data.vehicles.find((item) => item.id === id)
    return vehicle ? `${vehicle.code} · ${vehicle.name}` : 'Sin asignar'
  }
  const routeName = (id: string) => data.routes.find((route) => route.id === id)?.name ?? 'Recorrido eliminado'

  async function changeStatus(tripId: string, status: string) {
    setPendingId(tripId)
    setError('')
    try {
      await updateTripStatus(tripId, status)
      await onRefresh()
    } catch {
      setError('No se pudo actualizar el estado del viaje.')
    } finally {
      setPendingId(null)
    }
  }

  if (!trips.length) return <div className="empty-state"><CalendarDays aria-hidden="true" /><strong>Aún no hay viajes</strong><span>Asigna un recorrido, un conductor y un vehículo para crear el primero.</span></div>

  return <section className="trips-card">
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="table-wrap">
      <table className="operations-table">
        <thead><tr><th>Recorrido</th><th>Conductor</th><th>Vehículo</th><th>Salida</th><th>Estado</th><th>Progreso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{trips.map((trip) => <tr key={trip.id}>
          <td><strong>{routeName(trip.routeId)}</strong><span>{trip.id.slice(0, 8).toUpperCase()}</span></td>
          <td>{driverName(trip.driverId)}</td>
          <td>{vehicleName(trip.vehicleId)}</td>
          <td>{trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin horario'}</td>
          <td><label className="sr-only" htmlFor={`trip-status-${trip.id}`}>Estado del viaje {trip.id.slice(0, 8)}</label><select id={`trip-status-${trip.id}`} className={`status-select ${statusTone[trip.status] ?? 'muted'}`} value={trip.status} disabled={pendingId === trip.id} onChange={(event) => changeStatus(trip.id, event.target.value)}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
          <td><div className="progress-cell"><div className="progress" role="progressbar" aria-label={`Progreso del viaje ${trip.id.slice(0, 8)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={trip.progress}><span style={{ width: `${trip.progress}%` }} /></div><small>{trip.progress}%</small></div></td>
          <td><button className="icon-button" type="button" onClick={() => onEdit(trip)} aria-label={`Editar viaje ${trip.id.slice(0, 8)}`}><Pencil /></button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>
}
