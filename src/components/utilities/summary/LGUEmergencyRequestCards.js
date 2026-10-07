"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import { format } from "date-fns"
import { isHighUrgencyRequest, normalizeRequestStatus } from "@/lib/domain-values.mjs"
import { fetchHighUrgencyRequests } from "@/lib/emergency-requests.mjs"
import {
  Package, Search, ShieldAlert, Zap, ArrowUpRight, Hash
} from "lucide-react"

// -- Status config
const STATUS_CONFIG = {
  Pending: {
    label: "Pending", bg: "bg-amber-50", border: "border-amber-200",
    text: "text-amber-700", dot: "bg-amber-500", pillBg: "bg-amber-100",
  },
  Pending_Dispatch: {
    label: "Pending Dispatch", bg: "bg-orange-50", border: "border-orange-200",
    text: "text-orange-700", dot: "bg-orange-500", pillBg: "bg-orange-100",
  },
  Partially_Allocated: {
    label: "Partially Allocated", bg: "bg-blue-50", border: "border-blue-200",
    text: "text-blue-700", dot: "bg-blue-500", pillBg: "bg-blue-100",
  },
  Fully_Allocated: {
    label: "Fully Allocated", bg: "bg-indigo-50", border: "border-indigo-200",
    text: "text-indigo-700", dot: "bg-indigo-500", pillBg: "bg-indigo-100",
  },
  In_Transit: {
    label: "In Transit", bg: "bg-purple-50", border: "border-purple-200",
    text: "text-purple-700", dot: "bg-purple-500", pillBg: "bg-purple-100",
  },
  Received: {
    label: "Received", bg: "bg-green-50", border: "border-green-200",
    text: "text-green-700", dot: "bg-green-500", pillBg: "bg-green-100",
  },
  Returned: {
    label: "Returned", bg: "bg-teal-50", border: "border-teal-200",
    text: "text-teal-700", dot: "bg-teal-500", pillBg: "bg-teal-100",
  },
  Rejected: {
    label: "Rejected", bg: "bg-red-50", border: "border-red-200",
    text: "text-red-700", dot: "bg-red-500", pillBg: "bg-red-100",
  },
}

const getStatusConfig = (status) =>
  STATUS_CONFIG[normalizeRequestStatus(status)] || {
    label: (status || "Unknown").replace(/_/g, " "),
    bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600",
    dot: "bg-gray-400", pillBg: "bg-gray-100",
  }

// -- Skeleton Card
function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-gray-200 rounded-lg" />
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="h-3.5 w-40 bg-gray-100 rounded" />
      <div className="h-3 w-32 bg-gray-100 rounded" />
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

// -- Individual Request Card
function RequestCard({ request, onClick }) {
  const cfg = getStatusConfig(request.status)
  const shortId = (request.request_id || "").substring(0, 8).toUpperCase()
  const lguName =
    request.profiles?.municipality_or_city?.name ||
    request.municipality_or_city?.name ||
    request.profiles?.full_name ||
    "Unknown LGU"
  const requestType = (request.request_type || request.type || "Emergency Request").replace(/_/g, " ")
  const isUrgent = isHighUrgencyRequest(request)

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left bg-white border rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isUrgent ? "border-amber-200 hover:border-amber-300" : "border-gray-100 hover:border-gray-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 flex items-center justify-center size-7 rounded-lg ${cfg.pillBg}`}>
            <Hash className={`size-3.5 ${cfg.text}`} />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-sm text-gray-900 leading-tight">REQ-{shortId}</p>
            {isUrgent && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                <span className="relative flex size-1.5 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-amber-500" />
                </span>
                Needs Attention
              </span>
            )}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.pillBg} ${cfg.text} ${cfg.border}`}>
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <ShieldAlert className="size-3.5 text-gray-400 shrink-0" />
        <p className="font-semibold text-sm text-gray-700 truncate">{lguName}</p>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <Package className="size-3.5 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-500 font-medium capitalize truncate">{requestType}</p>
      </div>

      <div className={`flex items-center justify-between pt-2.5 border-t ${isUrgent ? "border-amber-100" : "border-gray-100"}`}>
        <span className="text-[11px] text-gray-400 font-medium">
          {request.created_at ? format(new Date(request.created_at), "MMM dd, yyyy hh:mm a") : "No date"}
        </span>
        <span className={`flex items-center gap-0.5 text-[11px] font-bold transition-all ${cfg.text} group-hover:gap-1`}>
          View Details <ArrowUpRight className="size-3" />
        </span>
      </div>
    </button>
  )
}

// -- Main Component
export default function LGUEmergencyRequestCards() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [fetchError, setFetchError] = useState(null)
  const currentFetch = useRef(null)
  const [isLive, setIsLive] = useState(false)

  const fetchRequests = useCallback(async (showLoading = true) => {
    if (currentFetch.current) return
    const controller = new AbortController()
    currentFetch.current = controller
    if (showLoading) setIsLoading(true)
    try {
      const data = await fetchHighUrgencyRequests(supabase, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      if (controller.signal.aborted) return
      setRequests(data)
      setFetchError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setFetchError("Unable to sync emergency requests right now. Retrying automatically.")
      console.error("[LGUEmergencyRequestCards] fetch error:", err)
    } finally {
      if (currentFetch.current === controller && !controller.signal.aborted) {
        currentFetch.current = null
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const initialFetch = setTimeout(() => fetchRequests(), 0)
    let refreshTimer
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => fetchRequests(false), 350)
    }
    const channel = supabase
      .channel("lgu_emergency_request_cards_v1")
      .on("postgres_changes", { event: "*", schema: "public", table: "resource_requests" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
      .subscribe(status => {
        setIsLive(status === "SUBSCRIBED")
        if (status === "SUBSCRIBED") scheduleRefresh()
      })
    const syncVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh()
    }
    const fallbackSync = setInterval(syncVisible, 5000)
    window.addEventListener("focus", syncVisible)
    window.addEventListener("online", syncVisible)
    document.addEventListener("visibilitychange", syncVisible)
    return () => {
      clearTimeout(initialFetch)
      clearTimeout(refreshTimer)
      clearInterval(fallbackSync)
      window.removeEventListener("focus", syncVisible)
      window.removeEventListener("online", syncVisible)
      document.removeEventListener("visibilitychange", syncVisible)
      currentFetch.current?.abort()
      currentFetch.current = null
      supabase.removeChannel(channel)
    }
  }, [fetchRequests])

  const filtered = requests.filter((req) => {
    const lguName = req.profiles?.municipality_or_city?.name || req.municipality_or_city?.name || req.profiles?.full_name || ""
    const shortId = (req.request_id || "").substring(0, 8).toUpperCase()
    const q = searchQuery.toLowerCase()
    return !q ||
      lguName.toLowerCase().includes(q) ||
      shortId.toLowerCase().includes(q) ||
      (req.request_type || "").toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-9 rounded-xl bg-red-100">
            <Zap className="size-4 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base text-gray-900 leading-tight">LGU Emergency Requests</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wide border border-red-200">
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-red-500" />
                </span>
                High Urgency Only
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {isLoading
                ? "Loading..."
                : requests.length > 0
                  ? <><span className="text-red-600 font-bold">{requests.length} active</span>{" - high urgency"}</>
                  : "No active high-urgency requests at the moment."
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 w-44 transition-all"
            />
          </div>
          <span role="status" className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
            {isLive ? "Live updates" : "Auto syncing"}
          </span>
        </div>
      </div>

      {fetchError && <p role="alert" className="text-xs text-red-600">{fetchError}</p>}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.request_id}
              request={req}
              onClick={() => router.push(`/provincial-admin/utilities/request/view-request?id=${req.request_id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-gray-100">
            <Package className="size-6 text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">No active emergency requests</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? "Try adjusting your search." : "No active High urgency requests are available."}
            </p>
          </div>
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-xs font-bold text-primary hover:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-[11px] text-gray-400 font-medium text-right">
          Showing {filtered.length} of {requests.length} requests
        </p>
      )}
    </div>
  )
}
