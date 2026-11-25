'use client'

import { useState } from 'react'
import { MapPin, Pencil, Plus, Route as RouteIcon, X } from 'lucide-react'
import { saveRoute } from '@/app/actions/operations'
import type { OperationsData, Route, RouteWaypoint, Trip } from '@/lib/operations-types'
import { RouteMap } from '@/components/route-map'
import { TripsTable } from '@/components/trips-table'

type Props = {
  data: OperationsData
  onCreateRoute: () => void
  onAssignTrip: (routeId?: string) => void
  onEditRoute: (route: Route) => void
  onEditTrip: (trip: Trip) => void
  onRefresh: () => Promise<void>
  onNotice: (message: string) => void
}

export function RoutesView({ data, onCreateRoute, onAssignTrip, onEditRoute, onEditTrip, onRefresh, onNotice }: Props) {
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [addingWaypoint, setAddingWaypoint] = useState(false)
  const selectedRoute = data.routes.find((route) => route.id === selectedRouteId) ?? data.routes[0]
  const routeTrips = selectedRoute ? data.trips.filter((trip) => trip.routeId === selectedRoute.id) : []

  async function movePin(route: Route, kind: 'start' | 'end' | 'waypoint', waypointId: string | null, point: { lat: number; lng: number }) {
    const waypoints: RouteWaypoint[] = kind === 'waypoint'
      ? route.waypoints.map((waypoint) => waypoint.id === waypointId ? { ...waypoint, ...point } : waypoint)
      : route.waypoints
    const updated = {
      ...route,
      ...(kind === 'start' ? { startLat: point.lat, startLng: point.lng } : {}),
      ...(kind === 'end' ? { endLat: point.lat, endLng: point.lng } : {}),
      waypoints,
    }
    try {
      await saveRoute(updated)
      await onRefresh()
      onNotice('Ubicación guardada.')
    } catch {
      onNotice('No se pudo guardar la ubicación del marcador.')
    }
  }

  async function removeWaypoint(waypointId: string) {
    if (!selectedRoute) return
    try {
      await saveRoute({ ...selectedRoute, waypoints: selectedRoute.waypoints.filter((waypoint) => waypoint.id !== waypointId) })
      await onRefresh()
      onNotice('Parada eliminada del recorrido.')
    } catch {
      onNotice('No se pudo eliminar la parada.')
    }
  }

  async function addWaypoint(point: { lat: number; lng: number }) {
    if (!selectedRoute) return
    const waypoint: RouteWaypoint = {
      id: crypto.randomUUID(),
      label: `Parada ${selectedRoute.waypoints.length + 1}`,
      ...point,
    }
    try {
      await saveRoute({ ...selectedRoute, waypoints: [...selectedRoute.waypoints, waypoint] })
      await onRefresh()
      setAddingWaypoint(false)
      onNotice('Parada agregada al recorrido.')
    } catch {
      onNotice('No se pudo agregar la parada.')
    }
  }

  return <div className="dashboard-content inner-view routes-page">
    <div className="welcome-row">
      <div><p className="eyebrow">PLANIFICADOR DE RECORRIDOS</p><h2>Rutas y viajes</h2><p className="muted">Diseña rutas en el mapa y asigna conductores y vehículos.</p></div>
      <div className="welcome-actions"><button className="button button-secondary" type="button" onClick={() => onAssignTrip(selectedRoute?.id)} disabled={!data.routes.length}><Plus aria-hidden="true" />Asignar viaje</button><button className="button button-primary" type="button" onClick={onCreateRoute}><Plus aria-hidden="true" />Nuevo recorrido</button></div>
    </div>
    <section className="map-workspace">
      <div className="map-workspace-header">
        <div><h3>Mapa de recorridos</h3><p>{selectedRoute ? selectedRoute.name : 'Crea un recorrido para empezar'}</p></div>
        <label className="route-picker-label">Recorrido<select aria-label="Seleccionar recorrido" value={selectedRoute?.id ?? ''} onChange={(event) => { setSelectedRouteId(event.target.value); setAddingWaypoint(false) }} disabled={!data.routes.length}><option value="" disabled>Selecciona un recorrido</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select></label>
      </div>
      <div className="route-map-tools">
        <span className="map-edit-hint"><MapPin aria-hidden="true" />{addingWaypoint ? 'Haz clic en el mapa para colocar una parada' : 'Arrastra los marcadores para actualizar sus coordenadas'}</span>
        <div className="map-tool-actions">
          {selectedRoute && <button className="button button-secondary button-small" type="button" onClick={() => onEditRoute(selectedRoute)}><Pencil aria-hidden="true" />Editar recorrido</button>}
          {selectedRoute && <button className={`button button-small ${addingWaypoint ? 'button-secondary' : 'button-outline'}`} type="button" aria-pressed={addingWaypoint} onClick={() => setAddingWaypoint((value) => !value)} disabled={!addingWaypoint && selectedRoute.waypoints.length >= 100}><Plus aria-hidden="true" />{addingWaypoint ? 'Cancelar parada' : 'Agregar parada'}</button>}
        </div>
      </div>
      <RouteMap routes={data.routes} selectedRouteId={selectedRoute?.id} editable addWaypointMode={addingWaypoint} onAddWaypoint={addWaypoint} onMovePin={movePin} />
      {selectedRoute && <div className="route-summary">
        <div><small>PARTIDA</small><strong>{selectedRoute.startAddress}</strong><span>{selectedRoute.startLat.toFixed(5)}, {selectedRoute.startLng.toFixed(5)}</span></div>
        <div className="route-summary-line"><RouteIcon aria-hidden="true" /><span>{selectedRoute.waypoints.length} {selectedRoute.waypoints.length === 1 ? 'parada' : 'paradas'}</span></div>
        <div><small>DESTINO</small><strong>{selectedRoute.endAddress}</strong><span>{selectedRoute.endLat.toFixed(5)}, {selectedRoute.endLng.toFixed(5)}</span></div>
        <button className="icon-button delete-route-button" type="button" onClick={() => onEditRoute(selectedRoute)} aria-label={`Editar ${selectedRoute.name}`}><Pencil aria-hidden="true" /></button>
      </div>}
      {selectedRoute && selectedRoute.waypoints.length > 0 && <ul className="waypoint-list" aria-label="Paradas del recorrido">{selectedRoute.waypoints.map((waypoint, index) => <li key={waypoint.id}><span><strong>{waypoint.label || `Parada ${index + 1}`}</strong><small>{waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}</small></span><button className="icon-button" type="button" onClick={() => removeWaypoint(waypoint.id)} aria-label={`Eliminar ${waypoint.label || `parada ${index + 1}`}`}><X aria-hidden="true" /></button></li>)}</ul>}
    </section>
    <div className="section-heading routes-trips-heading"><div><h3>Viajes asignados</h3><p>{routeTrips.length} {routeTrips.length === 1 ? 'viaje' : 'viajes'} para este recorrido</p></div><button className="button button-secondary button-small" type="button" onClick={() => onAssignTrip(selectedRoute?.id)} disabled={!selectedRoute}><Plus aria-hidden="true" />Asignar viaje</button></div>
    {selectedRoute ? <TripsTable data={data} trips={routeTrips} onEdit={onEditTrip} onRefresh={onRefresh} /> : <div className="empty-state"><RouteIcon aria-hidden="true" /><strong>No hay una ruta seleccionada</strong><span>Crea un recorrido para configurar viajes.</span><button className="button button-primary" type="button" onClick={onCreateRoute}>Crear recorrido</button></div>}
  </div>
}
