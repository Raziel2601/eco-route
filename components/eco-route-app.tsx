'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, ArrowRight, BarChart3, Bell, CalendarDays, CheckCircle2,
  ChevronDown, Clock3, FileText, Gauge, LifeBuoy, LogOut, Map, Menu,
  Navigation, Plus, Route as RouteIcon, Search, Settings2, ShieldCheck,
  Truck, Users, X,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { getOperations } from '@/app/actions/operations'
import type { Driver, OperationsData, Route, Trip, Vehicle } from '@/lib/operations-types'
import { OperationDialog } from '@/components/operation-dialog'
import { ManagementView } from '@/components/management-view'
import { RoutesView } from '@/components/routes-view'
import { TripsTable } from '@/components/trips-table'

const InteractiveMap = dynamic(() => import('@/components/route-map').then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Cargando mapa…</div>,
})

type View = 'overview' | 'routes' | 'inspections' | 'drivers' | 'fleet' | 'esg' | 'settings'
type DialogKind = 'driver' | 'vehicle' | 'route' | 'trip'
type DialogState = { kind: DialogKind; record?: Driver | Vehicle | Route | Trip; initialRouteId?: string }
type User = { id: string; name: string; email: string }

const viewTitles: Record<View, string> = {
  overview: 'Resumen general',
  routes: 'Rutas y viajes',
  inspections: 'Inspección de viajes',
  drivers: 'Conductores',
  fleet: 'Flota y vehículos',
  esg: 'Impacto Eco',
  settings: 'Preferencias',
}
const tripNames: Record<string, string> = {
  planned: 'Programado', in_progress: 'En curso', paused: 'En pausa', completed: 'Completado',
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ER'
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={compact ? 'brand brand-compact' : 'brand'}><span className="brand-mark"><RouteIcon aria-hidden="true" /></span><span><strong>ECO</strong> ROUTE</span></span>
}

function Sidebar({ active, onSelect, onLogout, onHelp, open, onClose, data, user }: {
  active: View
  onSelect: (view: View) => void
  onLogout: () => void
  onHelp: () => void
  open: boolean
  onClose: () => void
  data: OperationsData
  user: User
}) {
  const activeTrips = data.trips.filter((trip) => trip.status === 'in_progress').length
  const items: { id: View; icon: typeof Gauge; label: string; count?: number }[] = [
    { id: 'overview', icon: Gauge, label: 'Resumen general' },
    { id: 'routes', icon: Map, label: 'Rutas y viajes', count: activeTrips },
    { id: 'inspections', icon: FileText, label: 'Inspección de viajes', count: data.trips.length },
    { id: 'drivers', icon: Users, label: 'Conductores' },
    { id: 'fleet', icon: Truck, label: 'Flota y vehículos' },
    { id: 'esg', icon: BarChart3, label: 'Impacto Eco' },
  ]

  return <>
    <button className={open ? 'sidebar-overlay visible' : 'sidebar-overlay'} onClick={onClose} aria-label="Cerrar menú" />
    <aside className={open ? 'sidebar open' : 'sidebar'} aria-label="Navegación principal">
      <div className="sidebar-top"><Brand compact /><button className="close-sidebar" onClick={onClose} aria-label="Cerrar menú"><X /></button></div>
      <div className="workspace"><span className="workspace-icon">{initials(user.name)}</span><span><strong>{user.name}</strong><small>Espacio de trabajo</small></span><ChevronDown aria-hidden="true" /></div>
      <nav>
        <p className="nav-label">OPERACIÓN</p>
        {items.map(({ id, icon: Icon, label, count }) => <button key={id} type="button" onClick={() => { onSelect(id); onClose() }} className={active === id ? 'nav-item active' : 'nav-item'} aria-current={active === id ? 'page' : undefined}><Icon aria-hidden="true" />{label}{Boolean(count) && <span className="nav-count">{count}</span>}</button>)}
        <p className="nav-label secondary-label">CUENTA</p>
        <button className={active === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => { onSelect('settings'); onClose() }} type="button"><Settings2 aria-hidden="true" /> Preferencias</button>
        <button className="nav-item" onClick={() => { onHelp(); onClose() }} type="button"><LifeBuoy aria-hidden="true" /> Centro de ayuda</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="status-card"><span className="live-dot" /><span><strong>Datos sincronizados</strong><small>Guardados en tu espacio</small></span></div>
        <button className="nav-item logout" onClick={onLogout} type="button"><LogOut aria-hidden="true" /> Cerrar sesión</button>
      </div>
    </aside>
  </>
}

function Topbar({ title, user, data, onMenu, onSelect, onSignOut }: {
  title: string
  user: User
  data: OperationsData
  onMenu: () => void
  onSelect: (view: View) => void
  onSignOut: () => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const query = search.trim().toLocaleLowerCase()
  const results = useMemo(() => {
    if (!query) return []
    return [
      ...data.routes.filter((route) => route.name.toLocaleLowerCase().includes(query)).map((item) => ({ id: item.id, label: item.name, detail: 'Recorrido', view: 'routes' as View })),
      ...data.drivers.filter((driver) => driver.name.toLocaleLowerCase().includes(query)).map((item) => ({ id: item.id, label: item.name, detail: 'Conductor', view: 'drivers' as View })),
      ...data.vehicles.filter((vehicle) => `${vehicle.code} ${vehicle.name}`.toLocaleLowerCase().includes(query)).map((item) => ({ id: item.id, label: `${item.code} · ${item.name}`, detail: 'Vehículo', view: 'fleet' as View })),
    ].slice(0, 6)
  }, [data, query])
  const activeTrips = data.trips.filter((trip) => trip.status === 'in_progress').length
  const scheduledTrips = data.trips.filter((trip) => trip.status === 'planned').length

  return <>
    <header className="topbar">
      <div className="topbar-title"><button className="mobile-menu" onClick={onMenu} aria-label="Abrir menú"><Menu /></button><div><p>ESPACIO DE TRABAJO</p><h1>{title}</h1></div></div>
      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar'} aria-expanded={searchOpen} onClick={() => { setSearchOpen((value) => !value); setNotificationsOpen(false); setProfileOpen(false) }}>{searchOpen ? <X /> : <Search />}</button>
        <button className="icon-button notification" type="button" aria-label="Notificaciones" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); setProfileOpen(false) }}><Bell />{activeTrips + scheduledTrips > 0 && <span />}</button>
        <button className="user-menu" type="button" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setSearchOpen(false); setNotificationsOpen(false) }}><span className="avatar">{initials(user.name)}</span><span className="user-name"><strong>{user.name}</strong><small>{user.email}</small></span><ChevronDown aria-hidden="true" /></button>
      </div>
    </header>
    {searchOpen && <div className="topbar-popover search-popover"><label htmlFor="global-search">Buscar en tu espacio</label><input id="global-search" type="search" autoFocus placeholder="Rutas, conductores o vehículos" value={search} onChange={(event) => setSearch(event.target.value)} />{query && <div className="search-results" role="listbox" aria-label="Resultados de búsqueda">{results.length ? results.map((result) => <button type="button" role="option" key={`${result.view}-${result.id}`} onClick={() => { onSelect(result.view); setSearchOpen(false); setSearch('') }}><span><strong>{result.label}</strong><small>{result.detail}</small></span><ArrowRight aria-hidden="true" /></button>) : <p>No hay coincidencias en tus registros.</p>}</div>}</div>}
    {notificationsOpen && <div className="topbar-popover notification-popover" role="dialog" aria-label="Estado de viajes"><div className="popover-heading"><strong>Estado de viajes</strong><span>{data.trips.length} en total</span></div><p><span className="legend-dot green" />{activeTrips} en curso</p><p><span className="legend-dot blue" />{scheduledTrips} programados</p><button className="text-button" type="button" onClick={() => { onSelect('inspections'); setNotificationsOpen(false) }}>Revisar viajes <ArrowRight aria-hidden="true" /></button></div>}
    {profileOpen && <div className="topbar-popover profile-popover" role="menu"><div><strong>{user.name}</strong><small>{user.email}</small></div><button type="button" role="menuitem" onClick={onSignOut}><LogOut aria-hidden="true" /> Cerrar sesión</button></div>}
  </>
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Gauge; label: string; value: number; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon aria-hidden="true" /></span><div><p>{label}</p><strong>{value}</strong></div></article>
}

function Overview({ data, userName, onView, onCreateRoute, onAssignTrip, onEditTrip, onRefresh }: {
  data: OperationsData
  userName: string
  onView: (view: View) => void
  onCreateRoute: () => void
  onAssignTrip: () => void
  onEditTrip: (trip: Trip) => void
  onRefresh: () => Promise<void>
}) {
  const activeTrips = data.trips.filter((trip) => trip.status === 'in_progress').length
  const completedTrips = data.trips.filter((trip) => trip.status === 'completed').length
  const recentTrips = [...data.trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)

  return <div className="dashboard-content">
    <div className="welcome-row"><div><p className="eyebrow">PANEL DE OPERACIÓN</p><h2>Hola, {userName}</h2><p className="muted">Consulta los datos que has agregado a tu espacio de trabajo.</p></div><div className="welcome-actions"><button className="button button-secondary" type="button" onClick={onAssignTrip} disabled={!data.routes.length}><Plus aria-hidden="true" />Asignar viaje</button><button className="button button-primary" type="button" onClick={onCreateRoute}><Plus aria-hidden="true" />Crear recorrido</button></div></div>
    <div className="metric-grid">
      <Metric icon={Navigation} label="Viajes en curso" value={activeTrips} tone="green" />
      <Metric icon={CheckCircle2} label="Viajes completados" value={completedTrips} tone="blue" />
      <Metric icon={Users} label="Conductores" value={data.drivers.length} tone="purple" />
      <Metric icon={Truck} label="Vehículos" value={data.vehicles.length} tone="amber" />
      <Metric icon={RouteIcon} label="Recorridos" value={data.routes.length} tone="green" />
      <Metric icon={CalendarDays} label="Viajes registrados" value={data.trips.length} tone="blue" />
    </div>
    <div className="dashboard-grid overview-grid">
      <section className="map-panel overview-map-panel"><div className="map-toolbar"><div className="map-title"><Map aria-hidden="true" /><strong>Mapa de recorridos</strong></div><button className="text-button" type="button" onClick={() => onView('routes')}>Abrir mapa <ArrowRight aria-hidden="true" /></button></div><InteractiveMap routes={data.routes} /></section>
      <section className="activity-card"><div className="section-heading"><div><h3>Viajes recientes</h3><p>Registros de tu operación</p></div><button className="text-button" type="button" onClick={() => onView('inspections')}>Ver todos <ArrowRight aria-hidden="true" /></button></div>
        {recentTrips.length ? <div className="activity-list">{recentTrips.map((trip) => {
          const route = data.routes.find((item) => item.id === trip.routeId)
          const statusTone = trip.status === 'in_progress' ? 'green' : trip.status === 'paused' ? 'amber' : trip.status === 'completed' ? 'blue' : 'muted'
          return <button className="activity-item activity-button" type="button" key={trip.id} onClick={() => onEditTrip(trip)}><span className={`activity-icon ${statusTone}`}><Activity aria-hidden="true" /></span><span><strong>{route?.name ?? 'Recorrido sin nombre'}</strong><small>{tripNames[trip.status] ?? trip.status}</small></span><time dateTime={trip.createdAt}>{new Date(trip.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</time></button>
        })}</div> : <div className="empty-state compact-empty"><Clock3 aria-hidden="true" /><strong>Aún no hay actividad</strong><span>Los viajes aparecerán aquí cuando los asignes.</span></div>}
      </section>
    </div>
    <div className="section-heading overview-trips-heading"><div><h3>Viajes asignados</h3><p>Actualiza el estado de cada viaje desde esta tabla.</p></div><button className="button button-secondary button-small" type="button" onClick={onAssignTrip} disabled={!data.routes.length}><Plus aria-hidden="true" />Asignar viaje</button></div>
    <TripsTable data={data} onEdit={onEditTrip} onRefresh={onRefresh} />
  </div>
}

function ImpactView({ data }: { data: OperationsData }) {
  const completed = data.trips.filter((trip) => trip.status === 'completed').length
  const active = data.trips.filter((trip) => trip.status === 'in_progress').length
  return <div className="dashboard-content inner-view"><div className="welcome-row"><div><p className="eyebrow">IMPACTO Y SOSTENIBILIDAD</p><h2>Impacto Eco</h2><p className="muted">Un resumen basado en los datos registrados en tu operación.</p></div></div><div className="impact-summary"><Metric icon={RouteIcon} label="Recorridos diseñados" value={data.routes.length} tone="green" /><Metric icon={CheckCircle2} label="Viajes completados" value={completed} tone="blue" /><Metric icon={Navigation} label="Viajes en curso" value={active} tone="amber" /></div><section className="impact-note"><ShieldCheck aria-hidden="true" /><div><h3>Indicadores verificables</h3><p>Las emisiones y el ahorro de combustible aún no se calculan porque esos datos no forman parte de los registros actuales. Aquí solo se muestran totales guardados en tu cuenta.</p></div></section></div>
}

function Preferences({ darkMode, setDarkMode, compact, setCompact }: { darkMode: boolean; setDarkMode: (value: boolean) => void; compact: boolean; setCompact: (value: boolean) => void }) {
  return <div className="dashboard-content inner-view"><div className="welcome-row"><div><p className="eyebrow">CONFIGURACIÓN PERSONAL</p><h2>Preferencias</h2><p className="muted">Ajusta la presentación de este espacio durante tu sesión.</p></div></div><section className="preference-card preferences-single"><div><h3>Visualización</h3><p>Estas preferencias se reinician al cerrar la sesión.</p></div><label className="preference-row"><span><strong>Modo oscuro</strong><small>Cambia el contraste del panel</small></span><input type="checkbox" checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} /></label><label className="preference-row"><span><strong>Modo compacto</strong><small>Reduce el espacio entre registros</small></span><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /></label></section></div>
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><div className="dialog-heading"><div><p className="eyebrow">CENTRO DE AYUDA</p><h2 id="help-title">Cómo usar ECO ROUTE</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar ayuda"><X /></button></div><ol><li>Agrega conductores y vehículos desde sus secciones.</li><li>Crea un recorrido con sus coordenadas de inicio y destino.</li><li>En el mapa puedes arrastrar los marcadores y agregar paradas.</li><li>Asigna el recorrido a un viaje y actualiza su estado desde la tabla.</li></ol><button className="button button-primary" onClick={onClose}>Entendido</button></section></div>
}

export function EcoRouteApp({ initialData, user }: { initialData: OperationsData; user: User }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [activeView, setActiveView] = useState<View>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [compact, setCompact] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const heading = viewTitles[activeView]

  async function refreshData() {
    const updated = await getOperations()
    setData(updated)
  }

  function openDialog(kind: DialogKind, record?: Driver | Vehicle | Route | Trip, initialRouteId?: string) {
    setDialog({ kind, record, initialRouteId })
  }

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  const dialogProps = dialog?.kind === 'driver'
    ? { driver: dialog.record as Driver | undefined }
    : dialog?.kind === 'vehicle'
      ? { vehicle: dialog.record as Vehicle | undefined }
      : dialog?.kind === 'route'
        ? { route: dialog.record as Route | undefined }
        : dialog?.kind === 'trip'
          ? { trip: dialog.record as Trip | undefined }
          : {}

  return <div className={`app-shell ${darkMode ? 'dark-mode' : ''} ${compact ? 'compact-mode' : ''}`}>
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    <Sidebar active={activeView} onSelect={setActiveView} onLogout={signOut} onHelp={() => setHelpOpen(true)} open={menuOpen} onClose={() => setMenuOpen(false)} data={data} user={user} />
    <div className="main-shell">
      <Topbar title={heading} user={user} data={data} onMenu={() => setMenuOpen(true)} onSelect={setActiveView} onSignOut={signOut} />
      <main id="main-content">
        {activeView === 'overview' && <Overview data={data} userName={user.name} onView={setActiveView} onCreateRoute={() => openDialog('route')} onAssignTrip={() => openDialog('trip')} onEditTrip={(trip) => openDialog('trip', trip)} onRefresh={refreshData} />}
        {activeView === 'routes' && <RoutesView data={data} onCreateRoute={() => openDialog('route')} onAssignTrip={(routeId) => openDialog('trip', undefined, routeId)} onEditRoute={(route) => openDialog('route', route)} onEditTrip={(trip) => openDialog('trip', trip)} onRefresh={refreshData} onNotice={setNotice} />}
        {activeView === 'inspections' && <div className="dashboard-content inner-view"><div className="welcome-row"><div><p className="eyebrow">CONTROL Y SEGUIMIENTO</p><h2>Inspección de viajes</h2><p className="muted">Consulta y actualiza los viajes que has asignado.</p></div><button className="button button-primary" type="button" onClick={() => openDialog('trip')} disabled={!data.routes.length}><Plus aria-hidden="true" />Asignar viaje</button></div><TripsTable data={data} onEdit={(trip) => openDialog('trip', trip)} onRefresh={refreshData} /></div>}
        {(activeView === 'drivers' || activeView === 'fleet') && <ManagementView type={activeView} data={data} onCreate={() => openDialog(activeView === 'drivers' ? 'driver' : 'vehicle')} onEdit={(record) => openDialog(activeView === 'drivers' ? 'driver' : 'vehicle', record)} />}
        {activeView === 'esg' && <ImpactView data={data} />}
        {activeView === 'settings' && <Preferences darkMode={darkMode} setDarkMode={setDarkMode} compact={compact} setCompact={setCompact} />}
      </main>
      {notice && <div className="status-toast" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar notificación"><X aria-hidden="true" /></button></div>}
    </div>
    {dialog && <OperationDialog key={`${dialog.kind}-${dialog.record && 'id' in dialog.record ? dialog.record.id : 'new'}`} kind={dialog.kind} data={data} onClose={() => setDialog(null)} onSaved={refreshData} initialRouteId={dialog.initialRouteId} {...dialogProps} />}
    {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
  </div>
}
