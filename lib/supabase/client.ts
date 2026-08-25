import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type QSenseDatabase = {
  public: {
    Tables: {
      qsense_devices: {
        Row: { id: string; name: string; room: string; device_type: string; status: 'online' | 'warning' | 'offline'; reading: { value?: string; unit?: string }; updated_at: string; created_at: string }
        Insert: { id?: string; name: string; room: string; device_type: string; status: 'online' | 'warning' | 'offline'; reading?: { value?: string; unit?: string }; updated_at?: string; created_at?: string }
        Update: { name?: string; room?: string; device_type?: string; status?: 'online' | 'warning' | 'offline'; reading?: { value?: string; unit?: string }; updated_at?: string }
        Relationships: []
      }
      qsense_telemetry: {
        Row: { id: string; device_id: string; metric: string; value: number; unit: string | null; recorded_at: string }
        Insert: { id?: string; device_id: string; metric: string; value: number; unit?: string | null; recorded_at?: string }
        Update: { device_id?: string; metric?: string; value?: number; unit?: string | null; recorded_at?: string }
        Relationships: []
      }
      qsense_alerts: {
        Row: { id: string; device_id: string | null; title: string; description: string; severity: 'info' | 'warning' | 'critical'; resolved_at: string | null; created_at: string }
        Insert: { id?: string; device_id?: string | null; title: string; description: string; severity: 'info' | 'warning' | 'critical'; resolved_at?: string | null; created_at?: string }
        Update: { title?: string; description?: string; severity?: 'info' | 'warning' | 'critical'; resolved_at?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

let browserClient: SupabaseClient<QSenseDatabase> | undefined

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase environment variables are missing.')
    browserClient = createClient<QSenseDatabase>(url, key, { realtime: { params: { eventsPerSecond: 10 } } })
  }
  return browserClient
}
