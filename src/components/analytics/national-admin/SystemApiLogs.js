"use client"
import React, { useState, useEffect } from 'react';
import GeneralCard from "@/components/cards/GeneralCard";
import CardHeader from "@/components/cards/CardHeader";
import CardBasedText from "@/components/cards/CardBasedText";
import { supabase } from "@/supabase/util/supabase";
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton";
import { RefreshCcw } from "lucide-react";

export default function SystemApiLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemState, setSystemState] = useState("All Systems Operational");

  const fetchLogs = async () => {
    setIsRefreshing(true);
    // Fetch logs
    const { data: logData, error: logError } = await supabase
      .from('api_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    if (logData) {
      // Fetch APIs to map api_id to api_name
      const apiIds = [...new Set(logData.map(l => l.api_id))];
      const { data: apiData } = await supabase
        .from('api_monitoring')
        .select('api_id, api_name, api_status')
        .in('api_id', apiIds);
        
      const apiMap = {};
      let hasError = false;
      if (apiData) {
        apiData.forEach(api => {
            apiMap[api.api_id] = api.api_name;
            if (api.api_status === 'Error' || api.api_status === 'Warning') hasError = true;
        });
      }
      
      setSystemState(hasError ? "Systems Degraded" : "All Systems Operational");

      // Enrich data
      const enriched = logData.map(log => {
        const isError = log.event_type?.toLowerCase().includes('error');
        const messageStr = log.message || "";
        
        // Extract real STATUS and LATENCY if they were embedded by the backend
        const statusMatch = messageStr.match(/\|\s*STATUS:\s*(\d+)/i);
        const latencyMatch = messageStr.match(/\|\s*LATENCY:\s*(\d+ms)/i);
        
        let httpStatus = statusMatch ? `${statusMatch[1]} ${isError ? 'Error' : 'OK'}` : (isError ? "500 Error" : "200 OK");
        let latency = latencyMatch ? latencyMatch[1] : "N/A";

        // In case it's an error and we didn't explicitly format STATUS:, fallback to regex
        if (isError && !statusMatch) {
            const fallbackMatch = messageStr.match(/\b(4\d{2}|5\d{2})\b/);
            if (fallbackMatch) {
                httpStatus = `${fallbackMatch[1]} Error`;
            }
        }
        
        let statusColor = isError ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-800";
        if (httpStatus === "200 OK") statusColor = "bg-green-50 text-green-700";
        else if (httpStatus === "429 Error") statusColor = "bg-amber-50 text-amber-700";
        
        // Determine Badge State
        let stateBadge = "Success";
        let badgeStyle = "bg-green-50 text-green-600 border border-green-100";
        if (isError) {
            stateBadge = "Error";
            badgeStyle = "bg-red-50 text-red-600 border border-red-100";
        } else if (log.event_type?.toLowerCase().includes('warning') || httpStatus === "429 Error") {
            stateBadge = "Warning";
            badgeStyle = "bg-amber-50 text-amber-600 border border-amber-100";
        }

        // Clean up message by removing the STATUS and LATENCY metadata
        let cleanMessage = messageStr.replace(/\|\s*STATUS:\s*\d+/ig, '').replace(/\|\s*LATENCY:\s*\d+ms/ig, '');
        cleanMessage = cleanMessage.replace(/^\[.*?\]\s*/, '').trim();
        cleanMessage = cleanMessage.slice(0, 55) + (cleanMessage.length > 55 ? '...' : '');

        // Service Color
        const name = (apiMap[log.api_id] || "Unknown Service").toLowerCase();
        let dotColor = "bg-gray-500";
        if (name.includes('lantaw')) dotColor = "bg-blue-500";
        else if (name.includes('map')) dotColor = "bg-emerald-500";
        else if (name.includes('weather')) dotColor = "bg-amber-500";
        else if (name.includes('sms') || name.includes('semaphore')) dotColor = "bg-cyan-500";

        return {
            ...log,
            serviceName: apiMap[log.api_id] || "Unknown Service",
            httpStatus,
            statusColor,
            stateBadge,
            badgeStyle,
            dotColor,
            latency,
            cleanMessage
        };
      });
      
      setLogs(enriched);
    }
    
    setIsLoading(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('system-api-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_activity_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "N/A";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    if (diff > 1440) return `${Math.floor(diff/1440)} days ago`;
    if (diff > 60) return `${Math.floor(diff/60)} hrs ago`;
    return `${diff} mins ago`;
  };

  return (
    <GeneralCard className="p-5 flex flex-col gap-4 bg-white border border-gray-100 rounded-xl shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
        <div>
          <CardHeader className="text-lg font-bold text-gray-800">System & API Activity Logs</CardHeader>
          <CardBasedText className="text-xs text-gray-400 mt-1">Real-time health telemetry and third-party integration endpoint records.</CardBasedText>
        </div>
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${systemState.includes('Degraded') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${systemState.includes('Degraded') ? 'bg-red-500' : 'bg-green-500'}`}></div>
                {systemState}
            </div>
            <button 
                onClick={fetchLogs} 
                className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors text-gray-500"
            >
                <RefreshCcw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="text-gray-400 font-bold tracking-wider border-b border-gray-50">
              <th className="pb-3 pt-1 uppercase font-semibold">SERVICE / API</th>
              <th className="pb-3 pt-1 uppercase font-semibold">EVENT / OPERATION</th>
              <th className="pb-3 pt-1 uppercase font-semibold">TIMESTAMP</th>
              <th className="pb-3 pt-1 uppercase font-semibold">HTTP STATUS</th>
              <th className="pb-3 pt-1 uppercase font-semibold">LATENCY</th>
              <th className="pb-3 pt-1 uppercase font-semibold text-right">STATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><SingleLineSkeleton /></td>
                  <td className="py-3 px-2"><div className="w-10 h-4 bg-gray-100 rounded"></div></td>
                  <td className="py-3 px-2"><div className="w-8 h-4 bg-gray-100 rounded"></div></td>
                  <td className="py-3 pl-2 text-right"><div className="w-12 h-5 bg-gray-100 rounded inline-block"></div></td>
                </tr>
              ))
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 pr-2 font-semibold text-gray-800 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${log.dotColor}`}></div>
                    {log.serviceName}
                  </td>
                  <td className="py-4 px-2 text-gray-500 font-medium">
                    {log.cleanMessage}
                  </td>
                  <td className="py-4 px-2 text-gray-400 font-medium whitespace-nowrap">
                    {formatTimeAgo(log.created_at)}
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.statusColor}`}>
                      {log.httpStatus}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-gray-400 font-medium">
                    {log.latency}
                  </td>
                  <td className="py-4 pl-2 text-right">
                    <span className={`inline-flex justify-center px-2.5 py-1 rounded-full text-[10px] font-bold ${log.badgeStyle}`}>
                      {log.stateBadge}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-400">No recent API activity found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GeneralCard>
  );
}
