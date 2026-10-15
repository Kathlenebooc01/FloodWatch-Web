"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import BannerModal from "@/components/Modal/BannerModal"
import { ShieldAlert, MapPin, Volume2, X } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

const isEscalation = report =>
  `${report.hazard_type || ""} ${report.report_type || ""} ${report.description || ""}`.toLowerCase().includes("escalat")

const isNewEmergency = (table, row) =>
  (table !== 'incident_report' || isEscalation(row)) &&
  ['pending', 'pending_ai', 'submitted', 'ready_for_lgu'].includes((row.status || '').toLowerCase())

export default function DistressAlarmBanner() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [soundBlocked, setSoundBlocked] = useState(false)
  const audioRef = useRef(null)
  const seenRef = useRef(new Set())
  const pendingRef = useRef(new Set())
  const seenAtRef = useRef(null)
  const clearVersionRef = useRef(0)
  const storageKeyRef = useRef(null)
  const persistRef = useRef(Promise.resolve())

  const stopAlarm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSoundBlocked(false)
  }, [])

  const startAlarm = useCallback(async () => {
    if (!pendingRef.current.size) return
    if (!audioRef.current) {
      audioRef.current = new Audio('/sfx/TF022.WAV')
      audioRef.current.loop = true
    }
    const audio = audioRef.current
    if (!audio.paused) return
    try {
      await audio.play()
      if (audioRef.current === audio && pendingRef.current.size) setSoundBlocked(false)
    } catch {
      if (audioRef.current === audio && pendingRef.current.size) setSoundBlocked(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    let channels = []
    const persistSeenAt = seenAt => {
      persistRef.current = persistRef.current.then(async () => {
        try {
          return await supabase.auth.updateUser({ data: { provincial_distress_seen_at: seenAt } })
        } catch (error) {
          return { error }
        }
      })
      return persistRef.current
    }

    const enqueue = async (table, row, provinceId) => {
      const id = table === 'incident_report' ? row.report_id : row.distress_id
      const key = `${table}:${id}`
      if (!id || seenRef.current.has(key) || !isNewEmergency(table, row)) return
      seenRef.current.add(key)
      if (Date.parse(row.created_at) <= Date.parse(seenAtRef.current)) return

      const { data, error } = await supabase.from(table)
        .select('*, municipality:municipality_id(name, province_id)')
        .eq(table === 'incident_report' ? 'report_id' : 'distress_id', id).maybeSingle()
      if (error || !data || !active || data.municipality?.province_id !== provinceId) return
      if (!isNewEmergency(table, data) || Date.parse(data.created_at) <= Date.parse(seenAtRef.current)) return

      pendingRef.current.add(key)
      setAlerts(previous => [...previous, {
        key, id, municipality: data.municipality.name, createdAt: data.created_at
      }])
      void startAlarm()
    }

    const loadPending = async (provinceId) => {
      for (const table of ['distress_signals', 'incident_report']) {
        const { data, error } = await supabase.from(table)
          .select('*').gt('created_at', seenAtRef.current)
          .order('created_at', { ascending: true }).limit(200)
        if (error || !active) continue
        for (const row of data || []) await enqueue(table, row, provinceId)
      }
    }

    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase.from('profiles')
        .select('role, province_id').eq('id', user.id).maybeSingle()
      if (!active || profile?.role !== 'provincial_admin' || !profile.province_id) return
      const startVersion = clearVersionRef.current
      storageKeyRef.current = `floodwatch_distress_seen_at:${user.id}`
      const savedAt = user.user_metadata?.provincial_distress_seen_at
      let seenAt = savedAt
      if (!seenAt) {
        try { seenAt = localStorage.getItem(storageKeyRef.current) } catch {}
      }
      if (!seenAt) seenAt = new Date().toISOString()
      if (seenAtRef.current && Date.parse(seenAtRef.current) > Date.parse(seenAt)) {
        seenAt = seenAtRef.current
      }
      if (!active) return
      try { localStorage.setItem(storageKeyRef.current, seenAt) } catch {}
      if (clearVersionRef.current === startVersion) seenAtRef.current = seenAt
      if (!savedAt && clearVersionRef.current === startVersion) {
        const { error } = await persistSeenAt(seenAt)
        if (error) console.warn('Unable to save initial emergency alert state:', error.message)
      }
      if (!active) return
      const subscribe = table => supabase
        .channel(`provincial-emergency-${table}-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, payload => {
          void enqueue(table, payload.new, profile.province_id)
        }).subscribe()
      channels = [subscribe('distress_signals'), subscribe('incident_report')]
      void loadPending(profile.province_id)
    }

    const clearOnPageOpen = async () => {
      // The tab dispatches this only after the Distress Signals view opens.
      const version = ++clearVersionRef.current
      const openedAt = new Date().toISOString()
      seenAtRef.current = openedAt
      if (storageKeyRef.current) {
        try { localStorage.setItem(storageKeyRef.current, openedAt) } catch {}
      }
      stopAlarm()
      pendingRef.current.clear()
      setAlerts([])
      const { error } = await persistSeenAt(openedAt)
      if (error && clearVersionRef.current === version) console.warn('Unable to save Distress Signals visit:', error.message)
    }

    window.addEventListener('floodwatch:distress-page-opened', clearOnPageOpen)
    void start()
    return () => {
      active = false
      window.removeEventListener('floodwatch:distress-page-opened', clearOnPageOpen)
      channels.forEach(channel => { void supabase.removeChannel(channel) })
      stopAlarm()
    }
  }, [startAlarm, stopAlarm])

  const alert = alerts[0]
  if (!alert) return null
  const viewAlert = () => {
    router.push(`/provincial-admin/monitoring/lgu-monitoring?distressId=${encodeURIComponent(alert.id)}`)
  }

  return (
    <BannerModal className="bg-red-600 text-white p-0 overflow-hidden shadow-2xl rounded-3xl border-0">
      <div role="button" tabIndex={0} onClick={viewAlert}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewAlert() } }}
        className="p-4 grid gap-3 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-xl cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-2xl shrink-0"><ShieldAlert className="size-5" /></div>
          <div className="flex-1 min-w-0 text-left">
            <strong className="block text-sm">Emergency Distress Alert</strong>
            <span className="block text-xs text-red-100 mt-1">A new support escalation has been submitted by {alert.municipality}. Immediate attention is required.</span>
          </div>
          <button type="button" onClick={event => { event.stopPropagation(); setAlerts(previous => previous.slice(1)) }} aria-label="Dismiss alert" className="p-1 rounded-full hover:bg-white/20"><X className="size-4" /></button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-100">
          <span className="flex items-center gap-1"><MapPin className="size-3.5" />{alert.municipality}</span>
          <span>{new Date(alert.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={event => { event.stopPropagation(); viewAlert() }} className="bg-white text-red-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50">View Distress Signal</button>
          {soundBlocked && <button type="button" onClick={event => { event.stopPropagation(); void startAlarm() }} className="flex items-center gap-1 text-xs font-semibold text-white"><Volume2 className="size-4" /> Enable sound</button>}
        </div>
      </div>
    </BannerModal>
  )
}
