"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import { Cloud, Bot, RadioTower, Map, GitPullRequest, CircleSlash, Webhook, Loader2 } from "lucide-react"
import SingleLineSkeleton from "../skeleton/SingleLineSkeleton"
// Helper to get the correct icon based on API name
const getApiIcon = (name) => {
    const lowerName = name?.toLowerCase() || ""
    if (lowerName.includes("weather")) return <Cloud className="size-5" />
    if (lowerName.includes("lantaw")) return <Bot className="size-5" />
    if (lowerName.includes("semaphore")) return <RadioTower className="size-5" />
    if (lowerName.includes("mapbox") || lowerName.includes("map")) return <Map className="size-5" />
    return <Webhook className="size-5" /> // default icon
}

const getApiIconLarge = (name) => {
    const lowerName = name?.toLowerCase() || ""
    if (lowerName.includes("weather")) return <Cloud className="size-8 text-blue-500" />
    if (lowerName.includes("lantaw")) return <Bot className="size-8 text-blue-500" />
    if (lowerName.includes("semaphore")) return <RadioTower className="size-8 text-blue-500" />
    if (lowerName.includes("mapbox") || lowerName.includes("map")) return <Map className="size-8 text-blue-500" />
    return <Webhook className="size-8 text-blue-500" /> // default icon
}

export default function APILogs() {
    const [apis, setApis] = useState([])
    const [selectedApi, setSelectedApi] = useState(null)
    const [loading, setLoading] = useState(true)

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
                    setSelectedApi(data[0]) // Select the first one by default
                }
            } catch (err) {
                console.error("Error fetching API logs:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchApiLogs()
    }, [])

    if (apis.length === 0 && !loading) {
        return (
            <section className="flex justify-center items-center h-64 w-full text-gray-500">
                No API integrations found in the database.
            </section>
        )
    }

    // Helper for status banner styling
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
            <GeneralCard className="lg:col-span-4 gap-2 p-4">
                <div className="pb-3 mb-2 border-b border-gray-100">
                    <CardHeader className="text-gray-800 font-bold">Integrated APIs</CardHeader>
                    <CardBasedText className="text-xs text-gray-500">Manage your external connections</CardBasedText>
                </div>
                
                <div className="flex flex-col gap-3">
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
                        return (
                            <button 
                                key={api.api_id}
                                onClick={() => setSelectedApi(api)}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left w-full group ${
                                    isActive 
                                        ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                                        : 'hover:bg-gray-50 text-gray-600'
                                }`}
                            >
                                <div className={`p-2 rounded-lg shadow-sm shrink-0 border ${
                                    isActive 
                                        ? 'bg-white border-blue-100/50' 
                                        : 'bg-white border-gray-100 group-hover:border-gray-200'
                                }`}>
                                    {getApiIcon(api.api_name)}
                                </div>
                                <CardSubHeader className={isActive ? "font-semibold" : "font-medium"}>
                                    {api.api_name}
                                </CardSubHeader>
                            </button>
                        )
                    })}
                </div>
            </GeneralCard>

            {/* Main Panel: API Details */}
            <GeneralCard className="lg:col-span-8 flex flex-col gap-6 p-6">
                {loading ? (
                    <>
                        {/* Header Skeleton */}
                        <div className="flex items-start justify-between pb-5 border-b border-gray-100">
                            <div className="flex gap-4 items-center w-full max-w-sm">
                                <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 shrink-0"></div>
                                <div className="flex flex-col gap-3 w-full">
                                    <SingleLineSkeleton />
                                    <div className="w-1/2"><SingleLineSkeleton /></div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Skeleton */}
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
                        <div className="flex flex-col lg:flex-row items-start justify-between pb-5 border-b border-gray-100">
                            <div className="flex gap-4 items-center">
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100/50">
                                    {getApiIconLarge(selectedApi.api_name)}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <CardHeader className="text-xl font-bold text-gray-800">
                                        {selectedApi.api_name}
                                    </CardHeader>
                                    <CardBasedText className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <span>API ID:</span>
                                        <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                                            {selectedApi.api_id}
                                        </span>
                                    </CardBasedText>
                                </div>
                            </div>
                            <div className={`${getStatusBannerClass(selectedApi.api_status)} px-3 py-1.5 shadow-sm border`}>
                                <CardBasedText className="font-semibold capitalize">
                                    {selectedApi.api_status || "Unknown"}
                                </CardBasedText>
                            </div>
                        </div>

                        {/* Metrics Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Last Call Metric */}
                            <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                <div className="default-banner p-3 rounded-xl shadow-sm border border-blue-100">
                                    <GitPullRequest className="size-6 text-blue-600"/>
                                </div>
                                <div className="flex flex-col">
                                    <CardBasedText className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Last Call
                                    </CardBasedText>
                                    <CardHeader className="text-lg font-bold text-gray-800">
                                        {selectedApi.last_call_at 
                                            ? new Date(selectedApi.last_call_at).toLocaleString() 
                                            : "N/A"}
                                    </CardHeader>
                                </div>
                            </div>

                            {/* Error Message Metric */}
                            <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                <div className="default-banner-red p-3 rounded-xl shadow-sm border border-red-100">
                                    <CircleSlash className="size-6 text-red-600"/>
                                </div>
                                <div className="flex flex-col">
                                    <CardBasedText className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Error Message
                                    </CardBasedText>
                                    <CardHeader className="text-lg font-bold text-gray-800">
                                        {selectedApi.error_message || "None"}
                                    </CardHeader>
                                </div>
                            </div>
                        </div>
                        
                        {/* Activity History Section */}
                        <div className="mt-8">
                            <div className="pb-3 mb-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <CardHeader className="text-lg font-bold text-gray-800">Activity History</CardHeader>
                                    <CardBasedText className="text-xs text-gray-500">Recent events, errors, and changes for this API</CardBasedText>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                {selectedApi.error_message && (
                                    <div className="flex items-start gap-4 p-4 rounded-xl border border-red-100 bg-red-50/30">
                                        <div className="p-2 rounded-full bg-red-100 text-red-500 shrink-0">
                                            <CircleSlash className="size-4"/>
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-semibold text-red-800 text-sm">Error Encountered</span>
                                                <span className="text-xs text-red-400">
                                                    {selectedApi.last_call_at ? new Date(selectedApi.last_call_at).toLocaleString() : "Recently"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-red-600 mt-1">
                                                {selectedApi.error_message}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <div className="p-2 rounded-full bg-blue-50 text-blue-500 shrink-0">
                                        <GitPullRequest className="size-4"/>
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-semibold text-gray-800 text-sm">API Execution</span>
                                            <span className="text-xs text-gray-400">
                                                {selectedApi.last_call_at ? new Date(selectedApi.last_call_at).toLocaleString() : "Recently"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            The {selectedApi.api_name} API was triggered.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <div className="p-2 rounded-full bg-green-50 text-green-500 shrink-0">
                                        <Webhook className="size-4"/>
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-semibold text-gray-800 text-sm">Status Update</span>
                                            <span className="text-xs text-gray-400">Earlier</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            API status updated to <span className="font-semibold text-gray-700 capitalize">{selectedApi.api_status}</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </>
                ) : null}
            </GeneralCard>
        </section>
    )
}
