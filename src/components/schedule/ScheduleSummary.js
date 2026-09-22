"use client"
import { useState, useEffect } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardBasedText from "../cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"
import { format } from "date-fns"
import { Clock, Calendar as CalendarIcon, Tag, AlertCircle, ChevronRight } from "lucide-react"
import ViewEventModal from "./ViewEventModal"

export default function ScheduleSummary() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const fetchTodayEvents = async () => {
    setIsLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('scheduled_events')
      .select('*')
      .lte('start_date', todayStr)
      .order('start_time', { ascending: true })

    if (!error && data) {
      // Filter events that occur today (start_date === today OR end_date >= today)
      const todayEvents = data.filter(evt => {
        if (evt.start_date === todayStr) return true
        if (evt.end_date && evt.end_date >= todayStr) return true
        return false
      })
      setEvents(todayEvents)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTodayEvents()

    const channel = supabase
      .channel('schedule-summary-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_events' }, () => {
        fetchTodayEvents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return "All Day"
    const [h, m] = timeString.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return {
          card: 'bg-red-50/60 border-red-200 hover:bg-red-50 hover:border-red-300',
          badge: 'bg-red-100 text-red-700 border-red-200',
          dot: 'bg-red-500'
        }
      case 'high':
        return {
          card: 'bg-amber-50/60 border-amber-200 hover:bg-amber-50 hover:border-amber-300',
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          dot: 'bg-amber-500'
        }
      case 'low':
        return {
          card: 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300',
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500'
        }
      case 'medium':
      default:
        return {
          card: 'bg-blue-50/60 border-blue-200 hover:bg-blue-50 hover:border-blue-300',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          dot: 'bg-blue-500'
        }
    }
  }

  const todayFormatted = format(new Date(), 'EEEE, MMMM dd, yyyy')

  return (
    <>
      <GeneralCard className="p-5 md:p-6 border border-gray-200 grid gap-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <CardHeader className="text-gray-800 text-lg md:text-xl font-bold">Your Schedule for Today</CardHeader>
            <CardBasedText className="text-gray-400 text-xs font-semibold mt-0.5">{todayFormatted}</CardBasedText>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-fit">
            <CalendarIcon className="size-4 text-primary" />
            <span className="text-xs font-bold text-gray-700">{events.length} {events.length === 1 ? 'Event' : 'Events'} Today</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 py-2">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-gray-100/70 rounded-xl animate-pulse p-4 flex flex-col justify-between">
                <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/60 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2">
            <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100">
              <CalendarIcon className="size-6 text-gray-400" />
            </div>
            <CardBasedText className="text-gray-500 font-bold text-sm">No events scheduled for today</CardBasedText>
            <CardBasedText className="text-gray-400 text-xs">Events scheduled for today will appear here in real-time.</CardBasedText>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((evt) => {
              const styles = getPriorityStyle(evt.priority_level)

              return (
                <div
                  key={evt.event_id}
                  onClick={() => {
                    setSelectedEvent(evt)
                    setIsViewModalOpen(true)
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow flex flex-col justify-between gap-3 ${styles.card}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${styles.dot}`}></span>
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{evt.title}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${styles.badge}`}>
                      {evt.priority_level}
                    </span>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 font-medium pl-4">
                      {evt.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs text-gray-600 font-semibold pl-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 opacity-70" />
                      <span>
                        {formatTimeDisplay(evt.start_time)}
                        {evt.end_time ? ` - ${formatTimeDisplay(evt.end_time)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-bold text-[11px] opacity-80 hover:opacity-100">
                      <span>View</span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GeneralCard>

      <ViewEventModal
        isOpen={isViewModalOpen}
        event={selectedEvent}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedEvent(null)
        }}
        onRefresh={fetchTodayEvents}
      />
    </>
  )
}
