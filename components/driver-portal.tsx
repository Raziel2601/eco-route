'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, LogOut, MapPin, Pause, Play, Route, Truck } from 'lucide-react'
import { updateAssignedTripStatus } from '@/app/actions/driver'
import { authClient } from '@/lib/auth-client'
import type { DriverPortalData } from '@/lib/driver-data'

const statusLabel: Record<string, string> = {
  planned: 'Programado',
  in_progress: 'En curso',
  paused: 'En pausa',
  completed: 'Completado',
}

export function DriverPortal({ data }: { data: DriverPortalData }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function changeStatus(tripId: string, status: string) {
    setPendingId(tripId)
    setError('')
    try {
      await updateAssignedTripStatus(tripId, status)
      router.refresh()
    } catch {
      setError('No se pudo actualizar el viaje. Inténtalo de nuevo.')
    } finally {
      setPendingId(null)
    }
  }

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  const activeTrip = data.trips.find((trip) => trip.status === 'in_progress' || trip.status === 'paused')

  return <main className="driver-portal">
    <header className="driver-portal-header">
      <a className="brand driver-brand" href="/" aria-label="ECO ROUTE inicio"><span className="brand-mark"><Route aria-hidden="true" /></span><span><strong>ECO</strong> ROUTE</span></a>
      <button className="button button-secondary button-small" type="button" onClick={signOut}><LogOut aria-hidden="true" />Cerrar sesión</button>
    </header>
    <div className="driver-portal-content">
      <section className="driver-welcome">
        <p className="eyebrow">PORTAL DEL CONDUCTOR</p>
        <h1>Hola, {data.driverName}</h1>
        <p>Consulta tus recorridos asignados y actualiza el estado de tu viaje.</p>
        <div className="driver-welcome-stats">
          <span><strong>{data.trips.length}</strong><small>viajes asignados</small></span>
          <span><strong>{data.trips.filter((trip) => trip.status === 'completed').length}</strong><small>completados</small></span>
        </div>
        {activeTrip && <div className="active-trip-notice"><Clock3 aria-hidden="true" /><span>Viaje {activeTrip.status === 'paused' ? 'en pausa' : 'en curso'}: <strong>{activeTrip.routeName}</strong></span></div>}
      </section>
      <section className="driver-assignments" aria-labelledby="driver-assignments-title">
        <div className="driver-section-heading"><div><p className="eyebrow">TU OPERACIÓN</p><h2 id="driver-assignments-title">Mis viajes</h2></div><span>{data.trips.length} total</span></div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        {data.trips.length ? <div className="driver-assignment-list">{data.trips.map((trip) => <article className="driver-assignment-card" key={trip.id}>
          <div className={`driver-assignment-icon ${trip.status === 'completed' ? 'completed' : ''}`}><Route aria-hidden="true" /></div>
          <div className="driver-assignment-main">
            <div className="driver-assignment-title"><h3>{trip.routeName}</h3><span className={`driver-trip-status ${trip.status}`}>{statusLabel[trip.status] ?? trip.status}</span></div>
            <p className="driver-address"><MapPin aria-hidden="true" />{trip.startAddress}<ArrowRight aria-hidden="true" />{trip.endAddress}</p>
            <div className="driver-assignment-meta">
              <span><CalendarDays aria-hidden="true" />{trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin horario definido'}</span>
              {trip.vehicleName && <span><Truck aria-hidden="true" />{trip.vehicleName}</span>}
            </div>
          </div>
          {trip.status !== 'completed' && <div className="driver-assignment-actions">
            {trip.status === 'planned' && <button className="button button-primary button-small" type="button" disabled={pendingId === trip.id} onClick={() => changeStatus(trip.id, 'in_progress')}><Play aria-hidden="true" />{pendingId === trip.id ? 'Guardando…' : 'Iniciar viaje'}</button>}
            {trip.status === 'in_progress' && <><button className="button button-secondary button-small" type="button" disabled={pendingId === trip.id} onClick={() => changeStatus(trip.id, 'paused')}><Pause aria-hidden="true" />Pausar</button><button className="button button-primary button-small" type="button" disabled={pendingId === trip.id} onClick={() => changeStatus(trip.id, 'completed')}><CheckCircle2 aria-hidden="true" />Finalizar</button></>}
            {trip.status === 'paused' && <><button className="button button-secondary button-small" type="button" disabled={pendingId === trip.id} onClick={() => changeStatus(trip.id, 'in_progress')}><Play aria-hidden="true" />Reanudar</button><button className="button button-primary button-small" type="button" disabled={pendingId === trip.id} onClick={() => changeStatus(trip.id, 'completed')}><CheckCircle2 aria-hidden="true" />Finalizar</button></>}
          </div>}
        </article>)}</div> : <div className="driver-empty-state"><span><Route aria-hidden="true" /></span><h3>Aún no tienes viajes asignados</h3><p>Cuando el administrador te asigne un recorrido, aparecerá aquí.</p></div>}
      </section>
      <p className="driver-portal-footer">ECO ROUTE · Gestión segura de recorridos</p>
    </div>
  </main>
}
