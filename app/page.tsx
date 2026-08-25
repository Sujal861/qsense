'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, Bell, Camera, Check, ChevronRight, Fan, Lightbulb, Lock, Mic, RefreshCw, Shield, Thermometer, Video, Wifi, X, Zap } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Device = { id: string; name: string; room: string; device_type: string; status: 'online' | 'warning' | 'offline'; reading: { value?: string; unit?: string }; updated_at: string }
type Alert = { id: string; title: string; description: string; severity: 'info' | 'warning' | 'critical'; created_at: string; resolved_at: string | null }
type PermissionState = 'not requested' | 'granted' | 'denied' | 'unavailable'

type PermissionItem = { key: string; label: string; detail: string; state: PermissionState }
const iconFor = (type: string) => type === 'fan' ? Fan : type === 'light' ? Lightbulb : type === 'door' ? Lock : Thermometer

function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState('')
  useEffect(() => () => stream?.getTracks().forEach(track => track.stop()), [stream])
  async function toggle() {
    setError('')
    if (active) { stream?.getTracks().forEach(track => track.stop()); setStream(null); setActive(false); return }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access is unavailable in this browser.'); return }
    try { const next = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); setStream(next); setActive(true) } catch { setError('Camera permission was not granted.') }
  }
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream }, [stream])
  return <section className="panel camera-panel"><div className="panel-heading"><div><span className="eyebrow">BROWSER CAMERA</span><h2>Local sensing</h2></div><span className="live-chip"><i /> {active ? 'LIVE NOW' : 'PAUSED'}</span></div><div className="camera-frame">{active && stream ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="camera-art"><Camera size={34} /><span>Camera preview is off</span></div>}<div className="camera-overlay"><span>LOCAL ONLY</span><span>{active ? 'SENSING' : 'PREVIEW OFF'}</span></div></div>{error && <p className="error-note">{error}</p>}<div className="camera-controls"><button className={`control ${active ? 'active' : ''}`} onClick={toggle}><Video size={16} /> {active ? 'Stop camera' : 'Start camera'}</button><button className="icon-control" aria-label="Camera announcements unavailable"><Mic size={16} /></button><button className="icon-control" aria-label="Refresh camera"><RefreshCw size={16} /></button></div></section>
}

function PermissionPanel() {
  const [items, setItems] = useState<PermissionItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [temperature, setTemperature] = useState('Checking browser support…')
  useEffect(() => {
    const nav = navigator as Navigator & { permissions?: Permissions; DeviceMotionEvent?: { requestPermission?: () => Promise<string> }; DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }
    const available = (value: boolean) => value ? 'not requested' as PermissionState : 'unavailable' as PermissionState
    setItems([
      { key: 'camera', label: 'Camera', detail: 'For local visual sensing only.', state: available(!!navigator.mediaDevices?.getUserMedia) },
      { key: 'microphone', label: 'Microphone', detail: 'Optional audio input; nothing is recorded automatically.', state: available(!!navigator.mediaDevices?.getUserMedia) },
      { key: 'location', label: 'Location', detail: 'For location-aware device context.', state: available('geolocation' in navigator) },
      { key: 'motion', label: 'Motion & orientation', detail: 'For supported phone movement sensors.', state: available('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window) },
      { key: 'notifications', label: 'Notifications', detail: 'For alerts from this website.', state: available('Notification' in window) },
    ])
    setTemperature('Room temperature sensor is not exposed by this browser.')
    void nav.permissions
  }, [])
  async function request(item: PermissionItem) {
    setBusy(item.key)
    let state: PermissionState = 'denied'
    try {
      if (item.key === 'camera') { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); stream.getTracks().forEach(track => track.stop()); state = 'granted' }
      if (item.key === 'microphone') { const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); stream.getTracks().forEach(track => track.stop()); state = 'granted' }
      if (item.key === 'location') await new Promise<void>((resolve, reject) => navigator.geolocation.getCurrentPosition(() => resolve(), reject))
      if (item.key === 'notifications' && 'Notification' in window) state = await Notification.requestPermission() as PermissionState
      if (item.key === 'motion' || item.key === 'orientation') { const Sensor = item.key === 'motion' ? window.DeviceMotionEvent : window.DeviceOrientationEvent; const result = await Sensor?.requestPermission?.(); state = result === 'granted' ? 'granted' : 'denied' }
      if (item.key === 'location') state = 'granted'
    } catch { state = 'denied' }
    setItems(current => current.map(entry => entry.key === item.key ? { ...entry, state } : entry)); setBusy(null)
  }
  return <section className="panel permissions-panel"><div className="panel-heading"><div><span className="eyebrow">DEVICE ACCESS</span><h2>Choose what QSENSE can use</h2></div><Shield size={21} /></div><p className="permission-intro">Nothing is requested automatically. Approve each capability only when you need it.</p><div className="permission-list">{items.map(item => <div className="permission-row" key={item.key}><div className="permission-icon">{item.key === 'camera' ? <Camera size={17} /> : item.key === 'microphone' ? <Mic size={17} /> : item.key === 'location' ? <Activity size={17} /> : item.key === 'notifications' ? <Bell size={17} /> : <RefreshCw size={17} />}</div><div className="permission-copy"><strong>{item.label}</strong><span>{item.detail}</span></div><span className={`permission-state ${item.state.replace(' ', '-')}`}>{item.state}</span>{item.state === 'not requested' && <button className="permission-button" onClick={() => request(item)} disabled={busy === item.key}>{busy === item.key ? 'Waiting…' : 'Allow'}</button>}</div>)}</div><div className="temperature-note"><Thermometer size={17} /><div><strong>Phone temperature sensing</strong><span>{temperature} Web browsers do not provide a reliable ambient/room-temperature API on standard phones, so QSENSE will never invent a reading.</span></div></div></section>
}

function DeviceCard({ device, onToggle }: { device: Device; onToggle: (device: Device) => void }) { const Icon = iconFor(device.device_type); return <button className="device-card" onClick={() => onToggle(device)}><div className={`device-icon ${device.status}`}><Icon size={18} /></div><div className="device-copy"><strong>{device.name}</strong><span>{device.room}</span></div><div className="device-reading"><strong>{device.reading?.value ?? 'No reading'}{device.reading?.unit ? ` ${device.reading.unit}` : ''}</strong><span className={`state-text ${device.status}`}>{device.status}</span></div><ChevronRight size={16} className="chevron" /></button> }

export default function Page() {
  const [devices, setDevices] = useState<Device[]>([]); const [alerts, setAlerts] = useState<Alert[]>([]); const [telemetryCount, setTelemetryCount] = useState(0); const [connection, setConnection] = useState<'connecting' | 'live' | 'offline'>('connecting'); const [lastUpdate, setLastUpdate] = useState<string | null>(null); const [privacy, setPrivacy] = useState(false); const [message, setMessage] = useState(''); const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null)
  async function loadLiveData(client = supabase) { if (!client) return; const [deviceResult, alertResult, telemetryResult] = await Promise.all([client.from('qsense_devices').select('id,name,room,device_type,status,reading,updated_at').order('created_at'), client.from('qsense_alerts').select('id,title,description,severity,created_at,resolved_at').is('resolved_at', null).order('created_at', { ascending: false }), client.from('qsense_telemetry').select('id', { count: 'exact', head: true })]); if (deviceResult.error || alertResult.error || telemetryResult.error) { setConnection('offline'); setMessage('Live data could not be loaded.'); return }; setDevices(deviceResult.data ?? []); setAlerts(alertResult.data ?? []); setTelemetryCount(telemetryResult.count ?? 0); setConnection('live'); setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); setMessage('') }
  useEffect(() => { const client = getSupabaseBrowserClient(); setSupabase(client); loadLiveData(client); const channel = client.channel('qsense-live').on('postgres_changes', { event: '*', schema: 'public' }, () => loadLiveData(client)).subscribe(); const timer = window.setInterval(() => loadLiveData(client), 15000); return () => { window.clearInterval(timer); client.removeChannel(channel) } }, [])
  async function toggleDevice(device: Device) { if (!supabase) return; const next = device.status === 'online' ? 'warning' : 'online'; const { error } = await supabase.from('qsense_devices').update({ status: next }).eq('id', device.id); if (error) setMessage('This device could not be updated.'); else loadLiveData(supabase) }
  if (privacy) return <main className="privacy-view"><button className="back-link" onClick={() => setPrivacy(false)}>← Back to dashboard</button><div className="privacy-card"><Shield size={30} /><span className="eyebrow">QSENSE TRUST CENTER</span><h1>Your home,<br /><em>your control.</em></h1><p>Camera and device permissions are requested only after your action. Device telemetry and alerts are read from Supabase only.</p><div className="privacy-row"><span>Browser sensors</span><strong>User controlled</strong></div><div className="privacy-row"><span>Device telemetry</span><strong>{connection === 'live' ? 'Live Supabase data' : 'Unavailable'}</strong></div><button className="primary-action" onClick={() => setPrivacy(false)}>Return to live view</button></div></main>
  const online = devices.filter(d => d.status === 'online').length; const climate = devices.find(d => d.device_type === 'climate' && d.reading?.value)
  return <main className="app-shell"><header className="app-header"><div className="brand"><span className="brand-mark">Q</span><span>QSENSE</span><b>LIVE</b></div><div className="header-meta"><span className={`pulse ${connection}`}><i /> {connection === 'live' ? 'Supabase stream connected' : connection === 'offline' ? 'Connection unavailable' : 'Connecting to live stream'}</span><button aria-label="Notifications" className="header-icon"><Bell size={18} /><em>{alerts.length}</em></button><button aria-label="Privacy settings" className="header-icon" onClick={() => setPrivacy(true)}><Shield size={18} /></button></div></header><div className="dashboard"><div className="welcome-row"><div><span className="eyebrow">LIVE HOME MONITORING</span><h1>Your home, <em>in focus.</em></h1><p>Only data reported by your connected Supabase devices appears here.</p></div><div className="connection"><Activity size={17} /><span><strong>{connection === 'live' ? 'Live monitoring' : 'Data unavailable'}</strong><small>{lastUpdate ? `Updated ${lastUpdate}` : 'Waiting for data'}</small></span></div></div>{message && <p className="error-note">{message}</p>}<div className="dashboard-grid"><CameraPanel /><section className="panel overview-panel"><div className="panel-heading"><div><span className="eyebrow">HOME OVERVIEW</span><h2>Now</h2></div><span className="health-score"><i /> {devices.length ? `${online}/${devices.length}` : '—'} <small>online</small></span></div><div className="metric-grid"><div><Thermometer size={17} /><strong>{climate ? `${climate.reading.value}${climate.reading.unit ? ` ${climate.reading.unit}` : ''}` : '—'}</strong><span>Indoor temp</span></div><div><Wifi size={17} /><strong>{devices.length ? `${online} / ${devices.length}` : '—'}</strong><span>Devices online</span></div><div><Zap size={17} /><strong>{telemetryCount || '—'}</strong><span>Telemetry records</span></div><div><Lock size={17} /><strong>{devices.length ? 'Reported' : '—'}</strong><span>Access state</span></div></div></section></div><PermissionPanel /><div className="section-heading"><div><span className="eyebrow">CONNECTED HARDWARE</span><h2>Devices</h2></div><span className="text-action">{devices.length ? `${devices.length} live devices` : 'No live devices reported'}</span></div>{devices.length ? <div className="device-grid">{devices.map(device => <DeviceCard key={device.id} device={device} onToggle={toggleDevice} />)}</div> : <div className="empty-state"><Wifi size={19} /><span>No device records exist in Supabase yet.</span></div>}<div className="section-heading alert-heading"><div><span className="eyebrow">ATTENTION</span><h2>Alerts</h2></div><span className="alert-count">{alerts.length} open</span></div>{alerts.length ? alerts.map(alert => <article className="alert-card" key={alert.id}><div className="alert-icon"><Bell size={17} /></div><div className="alert-copy"><h3>{alert.title}</h3><p>{alert.description}</p></div></article>) : <div className="resolved-banner"><Check size={17} /> No open alerts reported by Supabase.</div>}</div><footer><span>QSENSE HOME INTELLIGENCE</span><button onClick={() => setPrivacy(true)}>Privacy & permissions</button></footer></main>
}
