'use client'

import { useEffect } from 'react'
import { divIcon, latLngBounds, type LatLngTuple } from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Route, RouteWaypoint } from '@/lib/operations-types'

const originIcon = divIcon({ className: 'eco-pin-shell', html: '<span class="eco-pin eco-pin-origin"><i>A</i></span>', iconSize: [30, 38], iconAnchor: [15, 34] })
const destinationIcon = divIcon({ className: 'eco-pin-shell', html: '<span class="eco-pin eco-pin-destination"><i>D</i></span>', iconSize: [30, 38], iconAnchor: [15, 34] })
const waypointIcon = divIcon({ className: 'eco-pin-shell', html: '<span class="eco-pin eco-pin-waypoint"><i>P</i></span>', iconSize: [28, 36], iconAnchor: [14, 32] })

type Point = { lat: number; lng: number }
type Props = {
  routes: Route[]
  selectedRouteId?: string
  editable?: boolean
  addWaypointMode?: boolean
  onAddWaypoint?: (point: Point) => void
  onMovePin?: (route: Route, kind: 'start' | 'end' | 'waypoint', waypointId: string | null, point: Point) => void
}

function FitSelectedRoute({ route }: { route?: Route }) {
  const map = useMap()
  useEffect(() => {
    if (!route) return
    const points: LatLngTuple[] = [
      [route.startLat, route.startLng],
      ...route.waypoints.map((point) => [point.lat, point.lng] as LatLngTuple),
      [route.endLat, route.endLng],
    ]
    const bounds = latLngBounds(points)
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })
  }, [map, route])
  return null
}

function ClickToAdd({ enabled, onAdd }: { enabled: boolean; onAdd?: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      if (enabled && onAdd) onAdd({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function RouteLayer({ route, editable, onMovePin }: { route: Route; editable: boolean; onMovePin?: Props['onMovePin'] }) {
  const path: LatLngTuple[] = [
    [route.startLat, route.startLng],
    ...route.waypoints.map((point) => [point.lat, point.lng] as LatLngTuple),
    [route.endLat, route.endLng],
  ]
  const dragHandler = (kind: 'start' | 'end' | 'waypoint', waypointId: string | null) => ({
    dragend(event: { target: { getLatLng: () => { lat: number; lng: number } } }) {
      const point = event.target.getLatLng()
      onMovePin?.(route, kind, waypointId, { lat: point.lat, lng: point.lng })
    },
  })

  return <>
    <Polyline positions={path} pathOptions={{ color: '#12815e', weight: 5, opacity: 0.82 }} />
    <Marker position={[route.startLat, route.startLng]} icon={originIcon} draggable={editable} eventHandlers={editable ? dragHandler('start', null) : undefined} title={`Partida: ${route.startAddress}`}>
      <Popup><strong>Partida</strong><br />{route.startAddress}<br />{editable && 'Arrastra el marcador para editarlo.'}</Popup>
    </Marker>
    {route.waypoints.map((point: RouteWaypoint, index) => <Marker key={point.id} position={[point.lat, point.lng]} icon={waypointIcon} draggable={editable} eventHandlers={editable ? dragHandler('waypoint', point.id) : undefined} title={point.label}>
      <Popup><strong>{point.label || `Parada ${index + 1}`}</strong><br />{editable && 'Arrastra el marcador para editarlo.'}</Popup>
    </Marker>)}
    <Marker position={[route.endLat, route.endLng]} icon={destinationIcon} draggable={editable} eventHandlers={editable ? dragHandler('end', null) : undefined} title={`Destino: ${route.endAddress}`}>
      <Popup><strong>Destino</strong><br />{route.endAddress}<br />{editable && 'Arrastra el marcador para editarlo.'}</Popup>
    </Marker>
  </>
}

export function RouteMap({ routes, selectedRouteId, editable = false, addWaypointMode = false, onAddWaypoint, onMovePin }: Props) {
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0]
  const center: LatLngTuple = selectedRoute
    ? [(selectedRoute.startLat + selectedRoute.endLat) / 2, (selectedRoute.startLng + selectedRoute.endLng) / 2]
    : [19.4326, -99.1332]
  const routeKey = selectedRoute?.id ?? 'empty-map'

  return <div className={`route-map ${addWaypointMode ? 'route-map-adding' : ''}`} role="region" aria-label="Mapa de recorridos">
    <MapContainer key={routeKey} center={center} zoom={12} scrollWheelZoom zoomControl className="route-map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitSelectedRoute route={selectedRoute} />
      <ClickToAdd enabled={editable && addWaypointMode} onAdd={onAddWaypoint} />
      {selectedRoute && <RouteLayer route={selectedRoute} editable={editable} onMovePin={onMovePin} />}
    </MapContainer>
    {addWaypointMode && <p className="map-click-hint">Selecciona un punto en el mapa para agregar una parada.</p>}
    {!selectedRoute && <div className="map-empty-message"><strong>Aún no hay recorridos</strong><span>Crea uno para mostrar sus puntos en el mapa.</span></div>}
  </div>
}
