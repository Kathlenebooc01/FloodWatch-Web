"use client"

import { useState, useEffect, useRef } from "react"
import BannerModal from "@/components/Modal/BannerModal"
import { ShieldAlert, Loader2, MapPin, CheckCircle2, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react"
import PrimaryButton from "@/components/button/PrimaryButton"
import { supabase } from "@/supabase/util/supabase"

export default function DistressAlarmBanner() {
  const [unacknowledgedSignals, setUnacknowledgedSignals] = useState([])
  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const audioRef = useRef(null)

  const fetchDistressSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('distress_signals')
        .select('*, profiles:profile_id(full_name, mobile_number), municipality:municipality_id(name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching distress signals:", error)
        return
      }

      // Filter for unacknowledged/pending signals
      const pendingSignals = (data || []).filter(s => {
        const st = (s.status || '').toLowerCase()
        const isAck = st === 'acknowledged' || st === 'resolved' || s.acknowledged_at !== null
        return !isAck
      })

      setUnacknowledgedSignals(pendingSignals)
    } catch (err) {
      console.error("Error in fetchDistressSignals:", err)
    }
  }

  useEffect(() => {
    fetchDistressSignals()

    // 1. Polling fallback every 3 seconds
    const pollInterval = setInterval(() => {
      fetchDistressSignals()
    }, 3000)

    // 2. Realtime subscription
    const channel = supabase
      .channel('distress-signals-realtime-channel-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distress_signals' }, () => {
        fetchDistressSignals()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchDistressSignals()
        }
      })

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Continuous emergency alarm audio playback
  useEffect(() => {
    if (unacknowledgedSignals.length > 0 && !isMuted) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sfx/EMERGENCY.wav')
        audioRef.current.loop = true
      }
      audioRef.current.play().catch(e => console.log("Emergency audio play blocked by browser policy:", e))
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [unacknowledgedSignals.length, isMuted])

  const handleAcknowledge = async (distressId) => {
    setIsAcknowledging(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Update status to 'Acknowledged' matching check constraint
      const { error } = await supabase
        .from('distress_signals')
        .update({
          status: 'Acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id || null
        })
        .eq('distress_id', distressId)

      if (error) throw error

      setUnacknowledgedSignals(prev => prev.filter(s => s.distress_id !== distressId))
    } catch (err) {
      console.error("Error acknowledging distress signal:", err)
      alert(err.message || "Failed to acknowledge distress signal.")
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (unacknowledgedSignals.length === 0) return null

  const activeSignal = unacknowledgedSignals[0]
  const signalCount = unacknowledgedSignals.length
  const senderName = activeSignal.profiles?.full_name || "Resident in Distress"
  const senderPhone = activeSignal.profiles?.mobile_number || "N/A"
  const locationName = activeSignal.municipality?.name || "Provincial Area"

  return (
    <BannerModal className="bg-red-600 text-white p-0 overflow-hidden shadow-2xl rounded-3xl border-0">
      <div className="p-4 grid gap-3 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-xl">
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Static Icon - No movement */}
            <div className="p-2 bg-white/20 rounded-2xl shrink-0">
              <ShieldAlert className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white text-red-700 px-2.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                  ACTIVE SOS ALERT
                </span>
                {signalCount > 1 && (
                  <span className="text-[10px] font-extrabold bg-red-950 text-white px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                    +{signalCount - 1} More
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-semibold truncate mt-0.5">
                Immediate Action Required ({locationName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              title={isMuted ? "Unmute Alarm" : "Mute Alarm"}
            >
              {isMuted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5 animate-pulse" />}
            </button>

            {/* Highlighted Chevron Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
              title={isExpanded ? "Hide Details" : "Show Details & Acknowledge"}
            >
              {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
          </div>
        </div>

        {/* Expanded Detailed Section & Primary Acknowledge Button */}
        {isExpanded && (
          <div className="grid gap-3 pt-2.5 border-t border-white/20 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Details Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 grid gap-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-red-200 text-[10px] font-bold uppercase tracking-wider block">Sender</span>
                  <span className="font-extrabold text-sm text-white">{senderName}</span>
                </div>
                <div className="text-right">
                  <span className="text-red-200 text-[10px] font-bold uppercase tracking-wider block">Location</span>
                  <span className="font-bold text-white flex items-center gap-1 justify-end">
                    <MapPin className="size-3.5 text-white shrink-0" /> {locationName}
                  </span>
                </div>
              </div>

              {activeSignal.remarks && (
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/10 mt-0.5">
                  <span className="text-red-200 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Remarks / Situation</span>
                  <p className="text-white font-medium italic">{activeSignal.remarks}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-[11px] text-red-100 pt-1 border-t border-white/10">
                <span>Phone: <strong>{senderPhone}</strong></span>
                <span>Reported: {new Date(activeSignal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Primary Acknowledge Button */}
            <PrimaryButton
              type="button"
              onClick={() => handleAcknowledge(activeSignal.distress_id)}
              disabled={isAcknowledging}
              className="w-full py-3 flex items-center justify-center gap-2 shadow-lg"
            >
              {isAcknowledging ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Acknowledging Signal...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4.5" />
                  <span>Acknowledge Emergency Signal</span>
                </>
              )}
            </PrimaryButton>
          </div>
        )}
      </div>
    </BannerModal>
  )
}
