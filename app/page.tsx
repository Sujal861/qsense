'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Bell, Camera, ChevronRight, Fan, Lightbulb, Lock, Mic, RefreshCw, Shield, Thermometer, Video, Wifi, X, Zap } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Device = { id: string; name: string; room: string; device_type: string; status: 'online' | 'warning' | 'offline'; reading: { value?: string; unit?: string }; updated_at: string }
type Alert = { id: string; title: string; description: string; severity: 'info' | 'warning' | 'critical'; created_at: string; resolved_at: string | null }

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
    try { const next = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); setStream(next); setActive(true); if (videoRef.current) videoRef.current.srcObject = next } catch { setError('Camera permission was not granted.') }
  }
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream }, [stream])
  return <section className="panel camera-panel"><div className="panel-heading"><div><span className="eyebrow">BROWSER CAMERA</span><h2>Local sensing</h2></div><span className="live-chip"><i /> {active ? 'LIVE NOW' : 'PAUSED'}</span></div><div className="camera-frame">{active && stream ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="camera-art"><Camera size={34} /><span>Camera preview is off</span></div>}<div className="camera-overlay"><span>LOCAL ONLY</span><span>{active ? 'SENSING' : 'PREVIEW OFF'}</span></div></div>{error && <p className="error-note">{error}</p>}<div className="camera-controls"><button className={`control ${active ? 'active' : ''}`} onClick={toggle}><Video size={16} /> {active ? 'Stop camera' : 'Start camera'}</button><button className="icon-control" aria-label="Camera announcements unavailable"><Mic size={16} /></button><button className="icon-control" aria-label="Refresh camera"><RefreshCw size={16} /></button></div></section>
}

function DeviceCard({ device, onToggle }: { device: Device; onToggle: (device: Device) => void }) { const Icon = iconFor(device.device_type); return <button className="device-card" onClick={() => onToggle(device)}><div className={`device-icon ${device.status}`}><Icon size={18} /></div><div className="device-copy"><strong>{device.name}</strong><span>{device.room}</span></div><div className="device-reading"><strong>{device.reading?.value ?? 'No reading'}{device.reading?.unit ? ` ${device.reading.unit}` : ''}</strong><span className={`state-text ${device.status}`}>{device.status}</span></div><ChevronRight size={16} className="chevron" /></button> }

export default function Page() {
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [telemetryCount, setTelemetryCount] = useState(0)
  const [connection, setConnection] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState(false)
  const [message, setMessage] = useState('')
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null)

  async function loadLiveData(client = supabase) {
    if (!client) return
    const [deviceResult, alertResult, telemetryResult] = await Promise.all([
      client.from('qsense_devices').select('id,name,room,device_type,status,reading,updated_at').order('created_at'),
      client.from('qsense_alerts').select('id,title,description,severity,created_at,resolved_at').is('resolved_at', null).order('created_at', { ascending: false }),
      client.from('qsense_telemetry').select('id', { count: 'exact', head: true }),
    ])
    if (deviceResult.error || alertResult.error || telemetryResult.error) { setConnection('offline'); setMessage('Live data could not be loaded.'); return }
    setDevices(deviceResult.data ?? []); setAlerts(alertResult.data ?? []); setTelemetryCount(telemetryResult.count ?? 0); setConnection('live'); setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); setMessage('')
  }
  useEffect(() => {
    const client = getSupabaseBrowserClient()
    setSupabase(client)
    loadLiveData(client)
    const channel = client.channel('qsense-live').on('postgres_changes', { event: '*', schema: 'public' }, () => loadLiveData(client)).subscribe()
    const timer = window.setInterval(() => loadLiveData(client), 15000)
    return () => { window.clearInterval(timer); client.removeChannel(channel) }
  }, [])
  async function toggleDevice(device: Device) {
    if (!supabase) return
    const next = device.status === 'online' ? 'warning' : 'online'
    const { error } = await supabase.from('qsense_devices').update({ status: next }).eq('id', device.id)
    if (error) setMessage('This device could not be updated.')
    else loadLiveData(supabase)
  }
  if (privacy) return <main className="privacy-view"><button className="back-link" onClick={() => setPrivacy(false)}>← Back to dashboard</button><div className="privacy-card"><Shield size={30} /><span className="eyebrow">QSENSE TRUST CENTER</span><h1>Your home,<br /><em>your control.</em></h1><p>Camera sensing stays in this browser. Device telemetry and alerts are read from Supabase only.</p><div className="privacy-row"><span>Camera access</span><strong>Browser controlled</strong></div><div className="privacy-row"><span>Device telemetry</span><strong>{connection === 'live' ? 'Live Supabase data' : 'Unavailable'}</strong></div><button className="primary-action" onClick={() => setPrivacy(false)}>Return to live view</button></div></main>
  const online = devices.filter(d => d.status === 'online').length
  return <main className="app-shell"><header className="app-header"><div className="brand"><span className="brand-mark">Q</span><span>QSENSE</span><b>LIVE</b></div><div className="header-meta"><span className={`pulse ${connection}`}><i /> {connection === 'live' ? 'Supabase stream connected' : connection === 'offline' ? 'Connection unavailable' : 'Connecting to live stream'}</span><button aria-label="Notifications" className="header-icon"><Bell size={18} /><em>{alerts.length}</em></button><button aria-label="Privacy settings" className="header-icon" onClick={() => setPrivacy(true)}><Shield size={18} /></button></div></header><div className="dashboard"><div className="welcome-row"><div><span className="eyebrow">LIVE HOME MONITORING</span><h1>Your home, <em>in focus.</em></h1><p>Only data reported by your connected Supabase devices appears here.</p></div><div className="connection"><Activity size={17} /><span><strong>{connection === 'live' ? 'Live monitoring' : 'Data unavailable'}</strong><small>{lastUpdate ? `Updated ${lastUpdate}` : 'Waiting for data'}</small></span></div></div>{message && <p className="error-note">{message}</p>}<div className="dashboard-grid"><CameraPanel /><section className="panel overview-panel"><div className="panel-heading"><div><span className="eyebrow">HOME OVERVIEW</span><h2>Now</h2></div><span className="health-score"><i /> {devices.length ? `${online}/${devices.length}` : '—'} <small>online</small></span></div><div className="metric-grid"><div><Thermometer size={17} /><strong>{devices.length ? devices.filter(d => d.device_type === 'climate').map(d => d.reading?.value).filter(Boolean)[0] ?? '—' : '—'}</strong><span>Indoor temp</span></div><div><Wifi size={17} /><strong>{devices.length ? `${online} / ${devices.length}` : '—'}</strong><span>Devices online</span></div><div><Zap size={17} /><strong>{telemetryCount || '—'}</strong><span>Telemetry records</span></div><div><Lock size={17} /><strong>{devices.length ? 'Reported' : '—'}</strong><span>Entry status</span></div></div></section></div><div className="section-heading"><div><span className="eyebrow">CONNECTED DEVICES</span><h2>Live device dashboard</h2></div></div>{devices.length ? <div className="device-grid">{devices.map(device => <DeviceCard key={device.id} device={device} onToggle={toggleDevice} />)}</div> : <div className="empty-state"><Wifi size={22} /><strong>No devices connected</strong><span>Add a device row in Supabase to see live readings here.</span></div>}<div className="section-heading alert-heading"><div><span className="eyebrow">ALERTS & ACTIONS</span><h2>{alerts.length ? 'Needs your attention' : 'No active alerts'}</h2></div></div>{alerts.length ? alerts.map(alert => <section className={`alert-card ${alert.severity}`} key={alert.id}><div className="alert-icon"><Zap size={19} /></div><div className="alert-copy"><span className="eyebrow">{alert.severity.toUpperCase()} · {new Date(alert.created_at).toLocaleString()}</span><h3>{alert.title}</h3><p>{alert.description}</p><button onClick={() => setMessage('Alerts are read-only until a secure resolve workflow is connected.')}><X size={15} /> Dismiss</button></div></section>) : <div className="empty-state"><strong>All clear</strong><span>No unresolved alert rows were returned by Supabase.</span></div>}</div></main>
}
