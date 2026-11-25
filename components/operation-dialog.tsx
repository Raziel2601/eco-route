'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { deleteRecord, saveDriver, saveRoute, saveTrip, saveVehicle } from '@/app/actions/operations'
import type { Driver, OperationsData, Route, Trip, Vehicle } from '@/lib/operations-types'

type Kind = 'driver' | 'vehicle' | 'route' | 'trip'
type Props = {
  kind: Kind
  data: OperationsData
  onClose: () => void
  onSaved: () => Promise<void>
  driver?: Driver
  vehicle?: Vehicle
  route?: Route
  trip?: Trip
  initialRouteId?: string
}

function formatDatetimeLocal(value: string) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const titles: Record<Kind, string> = {
  driver: 'conductor',
  vehicle: 'vehículo',
  route: 'recorrido',
  trip: 'viaje',
}

export function OperationDialog({ kind, data, onClose, onSaved, driver, vehicle, route, trip, initialRouteId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = Boolean(driver || vehicle || route || trip)

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const fields = new FormData(event.currentTarget)
    const value = (name: string) => String(fields.get(name) ?? '').trim()
    try {
      if (kind === 'driver') {
        await saveDriver({
          id: driver?.id,
          name: value('name'),
          email: value('email') || null,
          phone: value('phone') || null,
          license: value('license') || null,
          status: value('status'),
        })
      } else if (kind === 'vehicle') {
        const rawBattery = value('battery')
        await saveVehicle({
          id: vehicle?.id,
          code: value('code'),
          name: value('name'),
          type: value('type'),
          status: value('status'),
          battery: rawBattery === '' ? null : Number(rawBattery),
        })
      } else if (kind === 'route') {
        await saveRoute({
          id: route?.id,
          name: value('name'),
          startAddress: value('startAddress'),
          endAddress: value('endAddress'),
          startLat: Number(value('startLat')),
          startLng: Number(value('startLng')),
          endLat: Number(value('endLat')),
          endLng: Number(value('endLng')),
          waypoints: route?.waypoints ?? [],
        })
      } else {
        await saveTrip({
          id: trip?.id,
          routeId: value('routeId'),
          driverId: value('driverId') || null,
          vehicleId: value('vehicleId') || null,
          status: value('status'),
          scheduledAt: value('scheduledAt') || null,
        })
      }
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo guardar. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const id = driver?.id ?? vehicle?.id ?? route?.id ?? trip?.id
    if (!id || !window.confirm(`¿Eliminar este ${titles[kind]}?`)) return
    setSaving(true)
    try {
      await deleteRecord(kind, id)
      await onSaved()
      onClose()
    } catch {
      setError('No se pudo eliminar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const currentRoute = route ?? data.routes.find((item) => item.id === initialRouteId) ?? data.routes[0]

  return (
    <dialog ref={dialogRef} className="operation-dialog" aria-labelledby="operation-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">GESTIÓN OPERATIVA</p>
          <h2 id="operation-dialog-title">{editing ? 'Editar' : 'Agregar'} {titles[kind]}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario"><X aria-hidden="true" /></button>
      </div>
      <form className="operation-form" onSubmit={handleSubmit}>
        {kind === 'driver' && <>
          <label className="field-label" htmlFor="driver-name">Nombre<input id="driver-name" name="name" required maxLength={120} defaultValue={driver?.name ?? ''} autoFocus /></label>
          <div className="form-pair">
            <label className="field-label" htmlFor="driver-email">Correo<input id="driver-email" name="email" type="email" maxLength={254} defaultValue={driver?.email ?? ''} /></label>
            <label className="field-label" htmlFor="driver-phone">Teléfono<input id="driver-phone" name="phone" type="tel" maxLength={40} defaultValue={driver?.phone ?? ''} /></label>
          </div>
          <div className="form-pair">
            <label className="field-label" htmlFor="driver-license">Licencia<input id="driver-license" name="license" maxLength={60} defaultValue={driver?.license ?? ''} /></label>
            <label className="field-label" htmlFor="driver-status">Disponibilidad<select id="driver-status" name="status" defaultValue={driver?.status ?? 'available'}><option value="available">Disponible</option><option value="on-route">En recorrido</option><option value="off-duty">Fuera de turno</option></select></label>
          </div>
        </>}
        {kind === 'vehicle' && <>
          <div className="form-pair">
            <label className="field-label" htmlFor="vehicle-code">Código<input id="vehicle-code" name="code" required maxLength={40} defaultValue={vehicle?.code ?? ''} autoFocus /></label>
            <label className="field-label" htmlFor="vehicle-type">Tipo<input id="vehicle-type" name="type" required maxLength={50} defaultValue={vehicle?.type ?? 'Van'} /></label>
          </div>
          <label className="field-label" htmlFor="vehicle-name">Nombre o modelo<input id="vehicle-name" name="name" required maxLength={120} defaultValue={vehicle?.name ?? ''} /></label>
          <div className="form-pair">
            <label className="field-label" htmlFor="vehicle-status">Estado<select id="vehicle-status" name="status" defaultValue={vehicle?.status ?? 'available'}><option value="available">Disponible</option><option value="on-route">En recorrido</option><option value="maintenance">Mantenimiento</option></select></label>
            <label className="field-label" htmlFor="vehicle-battery">Batería, si aplica<input id="vehicle-battery" name="battery" type="number" min="0" max="100" step="1" defaultValue={vehicle?.battery ?? ''} /></label>
          </div>
        </>}
        {kind === 'route' && <>
          <label className="field-label" htmlFor="route-name">Nombre del recorrido<input id="route-name" name="name" required maxLength={120} defaultValue={route?.name ?? ''} autoFocus /></label>
          <label className="field-label" htmlFor="route-origin">Punto de partida<input id="route-origin" name="startAddress" required maxLength={180} defaultValue={route?.startAddress ?? ''} /></label>
          <div className="form-pair">
            <label className="field-label" htmlFor="route-start-lat">Latitud inicial<input id="route-start-lat" name="startLat" type="number" min="-90" max="90" step="any" required defaultValue={route?.startLat ?? ''} /></label>
            <label className="field-label" htmlFor="route-start-lng">Longitud inicial<input id="route-start-lng" name="startLng" type="number" min="-180" max="180" step="any" required defaultValue={route?.startLng ?? ''} /></label>
          </div>
          <label className="field-label" htmlFor="route-destination">Destino<input id="route-destination" name="endAddress" required maxLength={180} defaultValue={route?.endAddress ?? ''} /></label>
          <div className="form-pair">
            <label className="field-label" htmlFor="route-end-lat">Latitud final<input id="route-end-lat" name="endLat" type="number" min="-90" max="90" step="any" required defaultValue={route?.endLat ?? ''} /></label>
            <label className="field-label" htmlFor="route-end-lng">Longitud final<input id="route-end-lng" name="endLng" type="number" min="-180" max="180" step="any" required defaultValue={route?.endLng ?? ''} /></label>
          </div>
          <p className="form-hint">Los puntos se pueden ajustar después arrastrando los marcadores en el mapa.</p>
        </>}
        {kind === 'trip' && <>
          <label className="field-label" htmlFor="trip-route">Recorrido<select id="trip-route" name="routeId" required defaultValue={trip?.routeId ?? currentRoute?.id ?? ''} disabled={!data.routes.length}><option value="" disabled>Selecciona un recorrido</option>{data.routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="form-pair">
            <label className="field-label" htmlFor="trip-driver">Conductor<select id="trip-driver" name="driverId" defaultValue={trip?.driverId ?? ''}><option value="">Sin asignar</option>{data.drivers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field-label" htmlFor="trip-vehicle">Vehículo<select id="trip-vehicle" name="vehicleId" defaultValue={trip?.vehicleId ?? ''}><option value="">Sin asignar</option>{data.vehicles.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
          </div>
          <div className="form-pair">
            <label className="field-label" htmlFor="trip-status">Estado<select id="trip-status" name="status" defaultValue={trip?.status ?? 'planned'}><option value="planned">Programado</option><option value="in_progress">En curso</option><option value="paused">En pausa</option><option value="completed">Completado</option></select></label>
            <label className="field-label" htmlFor="trip-scheduled">Hora de salida<input id="trip-scheduled" name="scheduledAt" type="datetime-local" defaultValue={trip?.scheduledAt ? formatDatetimeLocal(trip.scheduledAt) : ''} /></label>
          </div>
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          {editing && <button className="button button-danger" type="button" onClick={handleDelete} disabled={saving}>Eliminar</button>}
          <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving || (kind === 'trip' && data.routes.length === 0)}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar'}</button>
        </div>
      </form>
    </dialog>
  )
}
