"use client"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import { 
  Cloud, Bot, RadioTower, Map, GitPullRequest, CircleSlash, Webhook, 
  Loader2, Search, X, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Sparkles, Filter
} from "lucide-react"
import SingleLineSkeleton from "../skeleton/SingleLineSkeleton"

// Helper to get the correct icon based on API name
const getApiIcon = (name) => {
    const lowerName = name?.toLowerCase() || ""
    if (lowerName.includes("weather")) return <Cloud className="size-5" />
    if (lowerName.includes("lantaw")) return <Bot className="size-5" />
    if (lowerName.includes("semaphore") || lowerName.includes("sms")) return <RadioTower className="size-5" />
    if (lowerName.includes("mapbox") || lowerName.includes("map")) return <Map className="size-5" />
    return <Webhook className="size-5" />
}

const getApiIconLarge = (name) => {
    const lowerName = name?.toLowerCase() || ""
    if (lowerName.includes("weather")) return <Cloud className="size-8 text-blue-500" />
    if (lowerName.includes("lantaw")) return <Bot className="size-8 text-blue-500" />
    if (lowerName.includes("semaphore") || lowerName.includes("sms")) return <RadioTower className="size-8 text-blue-500" />
    if (lowerName.includes("mapbox") || lowerName.includes("map")) return <Map className="size-8 text-blue-500" />
    return <Webhook className="size-8 text-blue-500" />
}

// Parses raw metadata (e.g., [Service] Message | STATUS:200 | LATENCY:150ms) into structured view
function parseLogEntry(log) {
    const rawMessage = log.message || ""
    const isError = log.event_type?.toLowerCase().includes('error')
    const isExec = log.event_type?.toLowerCase().includes('execution') || log.event_type?.toLowerCase().includes('call')

    // 1. Extract STATUS
    const statusMatch = rawMessage.match(/\|\s*STATUS:\s*(\d+)/i)
    let httpStatus = statusMatch ? statusMatch[1] : (isError ? "500" : "200")
    if (isError && !statusMatch) {
        const codeFallback = rawMessage.match(/\b(4\d{2}|5\d{2})\b/)
        if (codeFallback) httpStatus = codeFallback[1]
    }

    // 2. Extract LATENCY
    const latencyMatch = rawMessage.match(/\|\s*LATENCY:\s*(\d+ms)/i)
    const latency = latencyMatch ? latencyMatch[1] : null

    // 3. Extract Service Name [Service]
    const serviceMatch = rawMessage.match(/^\[(.*?)\]/)
    const serviceName = serviceMatch ? serviceMatch[1] : null

    // 4. Clean human-readable message
    let cleanMessage = rawMessage
        .replace(/^\[.*?\]\s*/, '')
        .replace(/\|\s*STATUS:\s*\d+/ig, '')
        .replace(/\|\s*LATENCY:\s*\d+ms/ig, '')
        .trim()

    // Friendly summary if error is a raw JSON dump
    let shortSummary = cleanMessage
    let hasDetails = false
    if (cleanMessage.includes('{') && cleanMessage.includes('}')) {
        hasDetails = true
        if (cleanMessage.includes('RESOURCE_EXHAUSTED') || httpStatus === '429') {
            shortSummary = "API Quota Exceeded (429): Free tier request rate limit reached on Google Gemini. Requests will resume automatically once quota window resets."
        } else if (cleanMessage.includes('UNAVAILABLE') || httpStatus === '503') {
            shortSummary = "Model Temporarily Unavailable (503): High demand detected. System automatically retries via fallback model."
        } else {
            const firstLine = cleanMessage.split('\n')[0]
            shortSummary = firstLine.slice(0, 160) + (firstLine.length > 160 ? '...' : '')
        }
    } else if (cleanMessage.length > 180) {
        hasDetails = true
        shortSummary = cleanMessage.slice(0, 180) + '...'
    }

    return {
        ...log,
        isError,
        isExec,
        httpStatus,
        latency,
        serviceName,
        cleanMessage,
        shortSummary,
        hasDetails,
        fullText: rawMessage
    }
}

export default function APILogs() {
    const [apis, setApis] = useState([])
    const [selectedApi, setSelectedApi] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activityLogs, setActivityLogs] = useState([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Filtering & Pagination State
    const [activeTab, setActiveTab] = useState("all") // "all" | "execution" | "error"
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    // Expanded details state
    const [expandedLogIds, setExpandedLogIds] = useState({})
    const [copiedLogId, setCopiedLogId] = useState(null)

    const toggleExpand = (id) => {
        setExpandedLogIds(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const copyToClipboard = (id, text) => {
        if (!navigator.clipboard) return
        navigator.clipboard.writeText(text)
        setCopiedLogId(id)
        setTimeout(() => setCopiedLogId(null), 2000)
    }

    const fetchLogs = async (silent = false) => {
        if (!selectedApi) return;
        if (!silent) setLoadingLogs(true);
        setIsRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('api_activity_logs')
                .select('*')
                .eq('api_id', selectedApi.api_id)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            if (data) setActivityLogs(data);
        } catch (err) {
            console.error("Error fetching activity logs:", err.message || JSON.stringify(err));
        } finally {
            setLoadingLogs(false);
            setTimeout(() => setIsRefreshing(false), 400);
        }
    }

    useEffect(() => {
        if (!selectedApi) return;
        setCurrentPage(1);
        setSearchQuery("");
        setExpandedLogIds({});
        fetchLogs();

        const channel = supabase
            .channel(`api-logs-${selectedApi.api_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'api_activity_logs', filter: `api_id=eq.${selectedApi.api_id}` }, () => {
                fetchLogs(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [selectedApi?.api_id])

    useEffect(() => {
        async function fetchApiLogs() {
            try {
                const { data, error } = await supabase
                    .from('api_monitoring')
                    .select('*')
                    .order('api_name', { ascending: true })

                if (error) throw error

                if (data && data.length > 0) {
                    setApis(data)
                    setSelectedApi(prev => prev ? data.find(a => a.api_id === prev.api_id) || data[0] : data[0])
                }
            } catch (err) {
                console.error("Error fetching API logs:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchApiLogs()

        const channel = supabase
            .channel('api-monitoring-logs-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'api_monitoring' }, () => {
                fetchApiLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [])

    // Process & Filter Logs
    const parsedLogs = useMemo(() => {
        return activityLogs.map(parseLogEntry);
    }, [activityLogs]);

    const counts = useMemo(() => {
        let exec = 0, err = 0;
        parsedLogs.forEach(l => {
            if (l.isError) err++;
            else exec++;
        });
        return { all: parsedLogs.length, execution: exec, error: err };
    }, [parsedLogs]);

    const filteredLogs = useMemo(() => {
        return parsedLogs.filter(log => {
            // Tab filter
            if (activeTab === 'execution' && log.isError) return false;
            if (activeTab === 'error' && !log.isError) return false;

            // Search query filter — match against ALL relevant fields (case-insensitive)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();

                const matched = [
                    log.fullText,        // raw message: includes [Service], STATUS:, LATENCY:, everything
                    log.cleanMessage,    // cleaned body text
                    log.shortSummary,    // visible summary shown in UI
                    log.serviceName,     // e.g. "Lantaw Verification", "Mapbox GL", "OpenWeather API"
                    log.event_type,      // e.g. "Execution", "AI Error", "Map Error", "Weather Error"
                    log.httpStatus,      // e.g. "200", "429", "500"
                    log.latency,         // e.g. "150ms"
                    log.isError ? 'error failed' : 'success active',
                ].some(field => field && String(field).toLowerCase().includes(q));

                if (!matched) return false;
            }

            return true;
        });
    }, [parsedLogs, activeTab, searchQuery]);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    // Paginated slice
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(start, start + itemsPerPage);
    }, [filteredLogs, currentPage, itemsPerPage]);

    if (apis.length === 0 && !loading) {
        return (
            <section className="flex justify-center items-center h-64 w-full text-gray-500">
                No API integrations found in the database.
            </section>
        )
    }

    const getStatusBannerClass = (status) => {
        const lowerStatus = status?.toLowerCase() || ""
        if (lowerStatus === 'active' || lowerStatus === 'online') return 'default-banner-green'
        if (lowerStatus === 'offline' || lowerStatus === 'error') return 'default-banner-red'
        if (lowerStatus === 'maintenance') return 'default-banner-amber'
        return 'default-banner'
    }

    return (
        <section className="grid lg:grid-cols-12 gap-5">
            {/* Sidebar: List of APIs */}
            <GeneralCard className="lg:col-span-4 gap-2 p-4 h-fit">
                <div className="pb-3 mb-2 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <CardHeader className="text-gray-800 font-bold">Integrated APIs</CardHeader>
                        <CardBasedText className="text-xs text-gray-500">Manage and monitor external connections</CardBasedText>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2.5">
                    {loading ? (
                        <>
                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col gap-3">
                                <SingleLineSkeleton />
                                <div className="w-2/3"><SingleLineSkeleton /></div>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col gap-3">
                                <SingleLineSkeleton />
                                <div className="w-1/2"><SingleLineSkeleton /></div>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col gap-3">
                                <SingleLineSkeleton />
                                <div className="w-3/4"><SingleLineSkeleton /></div>
                            </div>
                        </>
                    ) : apis.map((api) => {
                        const isActive = selectedApi?.api_id === api.api_id
                        const isErr = api.api_status?.toLowerCase() === 'error'
                        return (
                            <button 
                                key={api.api_id}
                                onClick={() => setSelectedApi(api)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left w-full group cursor-pointer ${
                                    isActive 
                                        ? 'bg-blue-50/80 text-blue-700 border border-blue-200/60 shadow-xs' 
                                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg shadow-2xs shrink-0 border ${
                                        isActive 
                                            ? 'bg-white border-blue-200 text-blue-600' 
                                            : 'bg-white border-gray-200/80 text-gray-600 group-hover:border-gray-300'
                                    }`}>
                                        {getApiIcon(api.api_name)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <CardSubHeader className={`truncate ${isActive ? "font-bold text-blue-900" : "font-semibold text-gray-800"}`}>
                                            {api.api_name}
                                        </CardSubHeader>
                                        <span className="text-[11px] text-gray-400 truncate">
                                            {api.last_call_at ? new Date(api.last_call_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No calls'}
                                        </span>
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5 pl-2">
                                    <span className={`w-2 h-2 rounded-full ${isErr ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className={`text-[11px] font-semibold capitalize ${isErr ? 'text-red-600' : 'text-emerald-700'}`}>
                                        {api.api_status || 'Active'}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </GeneralCard>

            {/* Main Panel: API Details & Activity History */}
            <GeneralCard className="lg:col-span-8 flex flex-col gap-6 p-6">
                {loading ? (
                    <>
                        <div className="flex items-start justify-between pb-5 border-b border-gray-100">
                            <div className="flex gap-4 items-center w-full max-w-sm">
                                <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 shrink-0"></div>
                                <div className="flex flex-col gap-3 w-full">
                                    <SingleLineSkeleton />
                                    <div className="w-1/2"><SingleLineSkeleton /></div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-4 bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                                <div className="w-1/3"><SingleLineSkeleton /></div>
                                <SingleLineSkeleton />
                            </div>
                            <div className="flex flex-col gap-4 bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                                <div className="w-1/3"><SingleLineSkeleton /></div>
                                <SingleLineSkeleton />
                            </div>
                        </div>
                    </>
                ) : selectedApi ? (
                    <>
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                            <div className="flex gap-4 items-center min-w-0">
                                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shrink-0 shadow-2xs">
                                    {getApiIconLarge(selectedApi.api_name)}
                                </div>
                                <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CardHeader className="text-xl font-bold text-gray-900">
                                            {selectedApi.api_name}
                                        </CardHeader>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Real-time Active</span>
                                        </div>
                                    </div>
                                    <CardBasedText className="text-xs font-medium text-gray-400 flex items-center gap-2">
                                        <span>API ID:</span>
                                        <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                                            {selectedApi.api_id}
                                        </span>
                                    </CardBasedText>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <button
                                    onClick={() => fetchLogs()}
                                    disabled={isRefreshing}
                                    title="Refresh logs from database"
                                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                                </button>
                                <div className={`${getStatusBannerClass(selectedApi.api_status)} px-3.5 py-1.5 shadow-2xs border`}>
                                    <CardBasedText className="font-bold text-xs uppercase tracking-wide">
                                        {selectedApi.api_status || "Unknown"}
                                    </CardBasedText>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 bg-gray-50/70 border border-gray-100 p-4 rounded-2xl shadow-2xs">
                                <div className="default-banner p-3 rounded-xl shadow-2xs border border-blue-100">
                                    <GitPullRequest className="size-5 text-blue-600"/>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <CardBasedText className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                        Last Call Recorded
                                    </CardBasedText>
                                    <CardHeader className="text-sm sm:text-base font-bold text-gray-800 truncate">
                                        {selectedApi.last_call_at 
                                            ? new Date(selectedApi.last_call_at).toLocaleString() 
                                            : "No recent calls"}
                                    </CardHeader>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50/70 border border-gray-100 p-4 rounded-2xl shadow-2xs">
                                <div className="default-banner-red p-3 rounded-xl shadow-2xs border border-red-100">
                                    <CircleSlash className="size-5 text-red-600"/>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <CardBasedText className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                        System Status Note
                                    </CardBasedText>
                                    <CardHeader className="text-sm font-semibold text-gray-800 truncate" title={selectedApi.error_message || "All systems normal"}>
                                        {selectedApi.error_message || "All operations healthy"}
                                    </CardHeader>
                                </div>
                            </div>
                        </div>
                        
                        {/* ── Organized Activity History Section ── */}
                        <div className="mt-4 flex flex-col gap-4">
                            {/* History Header & Filter Controls */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardHeader className="text-lg font-bold text-gray-900">Activity History</CardHeader>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                            {filteredLogs.length}
                                        </span>
                                    </div>
                                    <CardBasedText className="text-xs text-gray-500">
                                        Live event logs, successful executions, and error traces
                                    </CardBasedText>
                                </div>

                                {/* Controls: Tab Filters & Search Bar */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Tabs */}
                                    <div className="flex items-center p-1 bg-gray-100/80 rounded-xl border border-gray-200/60 text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("all")}
                                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                                activeTab === 'all' 
                                                    ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            All ({counts.all})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("execution")}
                                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                                activeTab === 'execution' 
                                                    ? 'bg-white text-emerald-600 shadow-2xs font-bold' 
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Executions ({counts.execution})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("error")}
                                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                                activeTab === 'error' 
                                                    ? 'bg-white text-red-600 shadow-2xs font-bold' 
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Errors ({counts.error})
                                        </button>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="size-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search logs..."
                                            className="w-36 sm:w-44 text-xs pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Logs List */}
                            <div className="flex flex-col gap-3 min-h-[300px]">
                                {loadingLogs ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                                        <Loader2 className="size-6 animate-spin text-blue-500" />
                                        <span className="text-xs font-medium">Fetching real-time activity history...</span>
                                    </div>
                                ) : paginatedLogs.length > 0 ? (
                                    paginatedLogs.map((log) => {
                                        const isExpanded = !!expandedLogIds[log.id];
                                        const isError = log.isError;
                                        const is429 = log.httpStatus === '429';
                                        
                                        const statusBadgeClass = isError 
                                            ? (is429 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200')
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                        const iconBg = isError 
                                            ? (is429 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600')
                                            : 'bg-blue-50 text-blue-600';

                                        const borderClass = isError 
                                            ? (is429 ? 'border-amber-200/70 bg-gradient-to-r from-amber-50/20 to-white' : 'border-red-200/70 bg-gradient-to-r from-red-50/20 to-white')
                                            : 'border-gray-100 bg-white hover:border-gray-200/80 shadow-2xs';

                                        return (
                                            <div 
                                                key={log.id} 
                                                className={`flex flex-col p-4 rounded-2xl border transition-all ${borderClass}`}
                                            >
                                                {/* Top Row: Icon + Header + Badges + Time */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 shadow-2xs ${iconBg}`}>
                                                            {isError ? (
                                                                is429 ? <AlertTriangle className="size-4" /> : <CircleSlash className="size-4"/>
                                                            ) : log.serviceName?.includes('Verify') || log.serviceName?.includes('Verification') ? (
                                                                <Sparkles className="size-4 text-blue-600"/>
                                                            ) : log.serviceName?.includes('Map') ? (
                                                                <Map className="size-4 text-emerald-600"/>
                                                            ) : log.serviceName?.includes('Weather') ? (
                                                                <Cloud className="size-4 text-amber-600"/>
                                                            ) : (
                                                                <GitPullRequest className="size-4"/>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {log.serviceName && (
                                                                    <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                                        {log.serviceName}
                                                                    </span>
                                                                )}
                                                                <span className={`text-xs font-bold ${isError ? 'text-red-900' : 'text-gray-900'}`}>
                                                                    {log.event_type}
                                                                </span>

                                                                {/* Status Code Badge */}
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusBadgeClass}`}>
                                                                    {log.httpStatus} {isError ? 'ERR' : 'OK'}
                                                                </span>

                                                                {/* Latency Pill */}
                                                                {log.latency && (
                                                                    <span className="text-[10px] font-mono font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                        ⚡ {log.latency}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Short/Clean Message */}
                                                            <p className={`text-xs mt-1.5 leading-relaxed ${isError ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                                                                {isExpanded ? log.cleanMessage : log.shortSummary}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end shrink-0 pl-2">
                                                        <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap flex items-center gap-1">
                                                            <Clock className="size-3" />
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300">
                                                            {new Date(log.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Expandable Technical Details (for long error traces or payload) */}
                                                {log.hasDetails && (
                                                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpand(log.id)}
                                                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                                            >
                                                                {isExpanded ? (
                                                                    <><ChevronUp className="size-3.5" /> Hide Raw Details</>
                                                                ) : (
                                                                    <><ChevronDown className="size-3.5" /> View Technical Payload / Error Trace</>
                                                                )}
                                                            </button>

                                                            {isExpanded && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(log.id, log.fullText)}
                                                                    className="text-[10px] font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                                                >
                                                                    {copiedLogId === log.id ? (
                                                                        <><Check className="size-3 text-emerald-600" /> Copied!</>
                                                                    ) : (
                                                                        <><Copy className="size-3" /> Copy Log</>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-normal border border-gray-800 shadow-inner max-h-56">
                                                                {log.fullText}
                                                            </pre>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-2">
                                        <Webhook className="size-8 text-gray-300" />
                                        <span className="text-sm font-semibold text-gray-600">No activity history found</span>
                                        <p className="text-xs text-gray-400 max-w-sm">
                                            {searchQuery 
                                                ? `No results match "${searchQuery}". Try clearing the search query or switching tabs.`
                                                : "No activity logs recorded yet for this API. Trigger an action such as opening a map, requesting weather, or running verification to generate logs."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ── Pagination Controls ── */}
                            {filteredLogs.length > itemsPerPage && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500 font-medium">
                                        Showing <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-bold text-gray-800">{filteredLogs.length}</span> logs
                                    </span>

                                    <div className="flex items-center gap-1.5 select-none">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage <= 1}
                                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <ChevronLeft className="size-3.5" />
                                            <span>Prev</span>
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                            // Show up to 5 page numbers cleanly
                                            if (
                                                page === 1 || 
                                                page === totalPages || 
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                const isActive = currentPage === page;
                                                return (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`size-7 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                                            isActive 
                                                                ? 'bg-blue-600 text-white shadow-2xs' 
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                return <span key={page} className="text-xs text-gray-400 px-0.5">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>Next</span>
                                            <ChevronRight className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </GeneralCard>
        </section>
    )
}
