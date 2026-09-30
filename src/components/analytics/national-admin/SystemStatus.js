"use client"
import React, { useState, useEffect } from 'react';
import GeneralCard from "@/components/cards/GeneralCard";
import CardSubHeader from "@/components/cards/CardSubHeader";
import CardBasedText from "@/components/cards/CardBasedText";
import { supabase } from "@/supabase/util/supabase";

export default function SystemStatus() {
  const [apis, setApis] = useState([]);
  const [lastSync, setLastSync] = useState("Just now");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApis = async (skipHealthCheck = false) => {
    setIsRefreshing(true);
    
    if (!skipHealthCheck) {
      // Intentionally left blank: Health check is now ONLY triggered manually by clicking the Refresh button
      // to avoid burning API quota on every page visit and creating static-looking duplicate logs.
    }

    const { data, error } = await supabase.from('api_monitoring').select('*');
    if (data) {
      setApis(data);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
    // Add a tiny artificial delay so the user sees the spin animation and knows it worked
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    fetchApis();
    
    const channel = supabase
      .channel('api-monitoring-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_monitoring' }, () => {
        fetchApis(true); // Skip health check on realtime updates to avoid infinite loop
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getApiData = (keyword) => {
    return apis.find(api => api.api_name?.toLowerCase().includes(keyword)) || null;
  };

  const lantaw = getApiData('lantaw');
  const mapbox = getApiData('mapbox') || getApiData('map');
  const weather = getApiData('weather');
  const sms = getApiData('semaphore') || getApiData('sms');

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "N/A";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    if (diff > 1440) return `${Math.floor(diff/1440)} days ago`;
    if (diff > 60) return `${Math.floor(diff/60)} hrs ago`;
    return `${diff} mins ago`;
  };

  const getStatusInfo = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'operational' || s === 'online') {
      return { color: 'emerald', text: 'Operational' };
    }
    if (s === 'warning' || s === 'maintenance') {
      return { color: 'amber', text: status || 'Warning' };
    }
    if (s === 'error' || s === 'offline') {
      return { color: 'red', text: status || 'Error' };
    }
    return { color: 'gray', text: status || 'Unknown' };
  };

  return (
    <GeneralCard className="p-5 flex flex-col gap-4 bg-white border border-gray-100 rounded-xl shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <CardSubHeader className="text-gray-800 font-bold text-sm">System Status & Service Integrations</CardSubHeader>
          </div>
          <CardBasedText className="text-xs text-gray-500 mt-1">Real-time health telemetry of national API connections and data pipeline nodes</CardBasedText>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Last synced: {lastSync}</span>
          <button 
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await fetch('/api/health-check');
              } catch (e) {
                console.log('Manual health check failed');
              }
              await fetchApis(true);
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Lantaw AI */}
        {(() => {
          const info = getStatusInfo(lantaw?.api_status || 'Operational');
          const isError = info.color === 'red';
          return (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">LA</div>
                  <span className="font-semibold text-sm text-gray-800">Lantaw<br/>AI</span>
                </div>
                <span className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold capitalize bg-${info.color}-100 text-${info.color}-700 border border-${info.color}-200 rounded-full`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-${info.color}-500`}></div>
                  {info.text}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Last ping:</div>
                <div className="text-right font-medium text-gray-800">{formatTimeAgo(lantaw?.last_call_at)}</div>
                <div className="text-gray-500">Details:</div>
                <div className={`text-right font-medium text-${isError ? 'red' : 'emerald'}-600 truncate`} title={lantaw?.error_message || "All systems normal"}>
                  {lantaw?.error_message || "All systems normal"}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Mapbox GL */}
        {(() => {
          const info = getStatusInfo(mapbox?.api_status || 'Operational');
          const isError = info.color === 'red';
          return (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">MB</div>
                  <span className="font-semibold text-sm text-gray-800">Mapbox<br/>GL</span>
                </div>
                <span className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold capitalize bg-${info.color}-100 text-${info.color}-700 border border-${info.color}-200 rounded-full`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-${info.color}-500`}></div>
                  {info.text}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Last ping:</div>
                <div className="text-right font-medium text-gray-800">{formatTimeAgo(mapbox?.last_call_at)}</div>
                <div className="text-gray-500">Details:</div>
                <div className={`text-right font-medium text-${isError ? 'red' : 'emerald'}-600 truncate`} title={mapbox?.error_message || "All systems normal"}>
                  {mapbox?.error_message || "All systems normal"}
                </div>
              </div>
            </div>
          );
        })()}

        {/* OpenWeather API */}
        {(() => {
          const info = getStatusInfo(weather?.api_status || 'Warning');
          const isError = info.color === 'red';
          return (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">OW</div>
                  <span className="font-semibold text-sm text-gray-800">OpenWeather<br/>API</span>
                </div>
                <span className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold capitalize bg-${info.color}-100 text-${info.color}-700 border border-${info.color}-200 rounded-full`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-${info.color}-500`}></div>
                  {info.text}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Last ping:</div>
                <div className="text-right font-medium text-gray-800">{formatTimeAgo(weather?.last_call_at)}</div>
                <div className="text-gray-500">Details:</div>
                <div className={`text-right font-medium text-${isError ? 'red' : 'emerald'}-600 truncate`} title={weather?.error_message || "All systems normal"}>
                  {weather?.error_message || "All systems normal"}
                </div>
              </div>
            </div>
          );
        })()}

        {/* SMS Gateway API */}
        {(() => {
          const info = getStatusInfo(sms?.api_status || 'Operational');
          const isError = info.color === 'red';
          return (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xs">SMS</div>
                  <span className="font-semibold text-sm text-gray-800">SMS<br/>Gateway API</span>
                </div>
                <span className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold capitalize bg-${info.color}-100 text-${info.color}-700 border border-${info.color}-200 rounded-full`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-${info.color}-500`}></div>
                  {info.text}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Last ping:</div>
                <div className="text-right font-medium text-gray-800">{formatTimeAgo(sms?.last_call_at)}</div>
                <div className="text-gray-500">Details:</div>
                <div className={`text-right font-medium text-${isError ? 'red' : 'emerald'}-600 truncate`} title={sms?.error_message || "All systems normal"}>
                  {sms?.error_message || "All systems normal"}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </GeneralCard>
  );
}
