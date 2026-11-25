'use client'

import { Plus, Truck, Users } from 'lucide-react'
import type { Driver, OperationsData, Vehicle } from '@/lib/operations-types'

const driverStatus: Record<string, { label: string; tone: string }> = {
  available: { label: 'Disponible', tone: 'green' },
  'on-route': { label: 'En recorrido', tone: 'blue' },
  'off-duty': { label: 'Fuera de turno', tone: 'muted' },
}
const vehicleStatus: Record<string, { label: string; tone: string }> = {
  available: { label: 'Disponible', tone: 'green' },
  'on-route': { label: 'En recorrido', tone: 'blue' },
  maintenance: { label: 'Mantenimiento', tone: 'amber' },
}

type Props = {
  type: 'drivers' | 'fleet'
  data: OperationsData
  onCreate: () => void
  onEdit: (record: Driver | Vehicle) => void
}

export function ManagementView({ type, data, onCreate, onEdit }: Props) {
  const isDriver = type === 'drivers'
  const records = isDriver ? data.drivers : data.vehicles
  const title = isDriver ? 'Conductores' : 'Flota y vehículos'

  return <div className="dashboard-content inner-view">
    <div className="welcome-row">
      <div><p className="eyebrow">GESTIÓN OPERATIVA</p><h2>{title}</h2><p className="muted">{isDriver ? 'Administra disponibilidad y datos del equipo.' : 'Mantén actualizados los datos y el estado de tus unidades.'}</p></div>
      <button className="button button-primary" type="button" onClick={onCreate}><Plus aria-hidden="true" />{isDriver ? 'Agregar conductor' : 'Agregar vehículo'}</button>
    </div>
    {records.length === 0
      ? <div className="empty-state"><span className="empty-state-icon">{isDriver ? <Users aria-hidden="true" /> : <Truck aria-hidden="true" />}</span><strong>{isDriver ? 'Todavía no hay conductores' : 'Todavía no hay vehículos'}</strong><span>Agrega información para empezar a asignar viajes.</span><button className="button button-secondary" type="button" onClick={onCreate}>Agregar {isDriver ? 'conductor' : 'vehículo'}</button></div>
      : <div className="management-grid">{records.map((record) => {
          const details = isDriver ? driverStatus[record.status] ?? { label: record.status, tone: 'muted' } : vehicleStatus[record.status] ?? { label: record.status, tone: 'muted' }
          const headline = isDriver ? (record as Driver).name : (record as Vehicle).name
          const identifier = isDriver ? (record as Driver).license || (record as Driver).email || (record as Driver).phone || 'Sin datos adicionales' : `${(record as Vehicle).code} · ${(record as Vehicle).type}`
          const meta = isDriver ? (record as Driver).email : (record as Vehicle).battery == null ? 'Nivel de batería no registrado' : `Batería ${(record as Vehicle).battery}%`
          return <article className="management-card" key={record.id}>
            <span className={`entity-avatar ${isDriver ? '' : 'vehicle-avatar'}`}>{isDriver ? <Users aria-hidden="true" /> : <Truck aria-hidden="true" />}</span>
            <div className="management-main"><strong>{headline}</strong><p>{identifier}</p><small>{meta || 'Sin correo registrado'}</small></div>
            <span className={`status-pill ${details.tone}`}><i />{details.label}</span>
            <button className="button button-secondary button-small" type="button" onClick={() => onEdit(record)}>Editar</button>
          </article>
        })}</div>}
  </div>
}
