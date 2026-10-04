"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GeneralCard from "@/components/cards/GeneralCard";
import { supabase } from "@/supabase/util/supabase";
import { 
  Sparkles, 
  CloudRain, 
  Brain, 
  ShieldAlert, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Wind,
  Radio
} from "lucide-react";

const STORAGE_KEY = 'lantaw_ai_prioritization_cache';
const DEBOUNCE_MS = 2000; // 2 seconds debounce for responsive real-time auto-prioritization

export default function AiPrioritizationCard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [newRequestAlert, setNewRequestAlert] = useState(false);
  const debounceTimer = useRef(null);

  // ── Stable analysis function (used by button + realtime) ──
  const runAiAnalysis = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/lantaw/prioritize-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to analyze requests with AI.");
      }
      const now = new Date().toISOString();
      setData(result.data);
      setLastAnalyzedAt(now);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: result.data, timestamp: now }));
    } catch (err) {
      console.error("AI Prioritization Error:", err);
      if (!silent) setError(err.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load cached result on mount or auto-analyze if first time ──
  useEffect(() => {
    let hasCachedData = false;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data) {
          setData(parsed.data);
          hasCachedData = true;
        }
        if (parsed?.timestamp) setLastAnalyzedAt(parsed.timestamp);
      }
    } catch {
      // ignore parse errors
    }

    // Auto-run if no cached analysis exists yet
    if (!hasCachedData) {
      runAiAnalysis(true);
    }
  }, [runAiAnalysis]);

  // ── Supabase Realtime: auto-trigger AI when new request arrives or changes ──
  useEffect(() => {
    const handleDbChange = () => {
      setIsLive(true);
      setNewRequestAlert(true);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        await runAiAnalysis(true);
        setTimeout(() => setNewRequestAlert(false), 4000);
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('lantaw_ai_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_request_items' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations' }, handleDbChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [runAiAnalysis]);

  const getPriorityBadge = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyColor = (score) => {
    if (score >= 90) return 'text-red-600 bg-red-500';
    if (score >= 75) return 'text-amber-600 bg-amber-500';
    if (score >= 50) return 'text-blue-600 bg-blue-500';
    return 'text-slate-600 bg-slate-400';
  };

  return (
    <GeneralCard className="p-5 border border-indigo-100 bg-gradient-to-b from-white to-slate-50/50 rounded-xl shadow-sm">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Brain className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Lantaw AI Request Prioritization & Weather Risk Analysis
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100/70 text-indigo-800 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              AI Powered
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="Connected to Supabase Realtime — automatic updates on new requests">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Sync Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Correlates historical disaster resource requests with live OpenWeather telemetry and municipal flood vulnerability.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button
            onClick={() => runAiAnalysis(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Data...
              </>
            ) : data ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Re-analyze with AI
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Analyze &amp; Prioritize Requests
              </>
            )}
          </button>
          {lastAnalyzedAt && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Last analyzed: {new Date(lastAnalyzedAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Realtime Activity Alert Banner ── */}
      {newRequestAlert && (
        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800 animate-pulse">
          <span className="flex items-center gap-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>⚡ New resource request activity detected — updating AI prioritization in real-time...</span>
          </span>
          <span className="text-[10px] text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded font-semibold">Auto-evaluating</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Initial Empty State ── */}
      {!data && !loading && (
        <div className="py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600">
            <CloudRain className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">
            Ready for Automated AI Priority Evaluation
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
            Click the button above to synthesize incoming resource requests, weather rainfall rates, wind speed, and historical LGU disaster demand.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-2xs">
              <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" /> Historical Patterns
              </div>
              <p className="text-xs text-gray-700 mt-1">Evaluates past LGU request frequencies and recurring flood corridors.</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-2xs">
              <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <Wind className="w-3 h-3 text-blue-500" /> Weather Telemetry
              </div>
              <p className="text-xs text-gray-700 mt-1">Cross-references live precipitation (mm/h) and coastal storm intensity.</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-2xs">
              <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-red-500" /> Life-Safety Queue
              </div>
              <p className="text-xs text-gray-700 mt-1">Ranks water search & rescue, power, and food requests by urgency.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton State ── */}
      {loading && (
        <div className="py-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h4 className="text-sm font-medium text-gray-900">
            Lantaw AI is analyzing historical data & live weather...
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Correlating OpenWeather monitoring stations with municipal emergency requests to calculate urgency scores.
          </p>
          <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-[indeterminate_1.5s_infinite_linear]" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* ── Analysis Results ── */}
      {data && !loading && (
        <div className="mt-4 space-y-4">
          {/* Executive Summary Card */}
          <div className="p-4 bg-indigo-900 text-white rounded-xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-indigo-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  AI Disaster Assessment
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {data.executive_summary?.highest_risk_area && (
                  <span className="px-2.5 py-1 rounded-md bg-red-500/20 text-red-200 border border-red-500/30 font-medium">
                    Priority Area: <strong className="text-white">{data.executive_summary.highest_risk_area}</strong>
                  </span>
                )}
                {data.executive_summary?.key_weather_factor && (
                  <span className="px-2.5 py-1 rounded-md bg-indigo-800 text-indigo-100 font-medium">
                    Driver: {data.executive_summary.key_weather_factor}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs md:text-sm text-indigo-100 leading-relaxed">
              {data.executive_summary?.summary}
            </p>
          </div>

          {/* Weather Telemetry Snapshot Bar */}
          {data.weather_telemetry && data.weather_telemetry.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {data.weather_telemetry.map((st, idx) => (
                <div key={idx} className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-[11px] truncate max-w-[120px]">{st.name}</div>
                    <div className="text-gray-500 text-[10px] capitalize">{st.condition}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">{st.rain_1h_mm ?? 0} mm/h</div>
                    <div className="text-[10px] text-gray-400">{st.wind_kmh ?? 0} km/h wind</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prioritized Requests Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Rank & Urgency</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Municipality</th>
                  <th className="py-2.5 px-3">Requested Supplies</th>
                  <th className="py-2.5 px-3">Weather Impact Factor</th>
                  <th className="py-2.5 px-3">AI Reasoning & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.prioritized_queue?.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-50/70 transition-colors">
                    {/* Rank & Urgency */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs">
                          #{item.rank}
                        </span>
                        <div>
                          <div className="font-bold text-xs">
                            <span className={getUrgencyColor(item.urgency_score).split(' ')[0]}>
                              {item.urgency_score}
                            </span>
                            <span className="text-gray-400 text-[10px]"> /100</span>
                          </div>
                          <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                            <div 
                              className={`h-full ${getUrgencyColor(item.urgency_score).split(' ')[1]}`} 
                              style={{ width: `${item.urgency_score}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getPriorityBadge(item.priority_level)}`}>
                        {item.priority_level}
                      </span>
                    </td>

                    {/* Municipality */}
                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                      {item.municipality}
                    </td>

                    {/* Requested Supplies */}
                    <td className="py-3 px-3 text-gray-700 max-w-[200px]">
                      <span className="font-medium text-indigo-950">{item.requested_items}</span>
                    </td>

                    {/* Weather Impact Factor */}
                    <td className="py-3 px-3 text-gray-600 max-w-[220px]">
                      <div className="flex items-start gap-1 text-[11px]">
                        <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{item.weather_impact_factor}</span>
                      </div>
                    </td>

                    {/* AI Reasoning & Action */}
                    <td className="py-3 px-3 max-w-[280px]">
                      <p className="text-[11px] text-gray-800 font-medium">
                        {item.ai_reasoning}
                      </p>
                      {item.recommended_action && (
                        <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
                          <ArrowRight className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          {item.recommended_action}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Strategic Recommendations */}
          {data.executive_summary?.strategic_recommendations && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Actionable Directives for Command Center
              </div>
              <ul className="space-y-1 text-xs text-gray-600">
                {data.executive_summary.strategic_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </GeneralCard>
  );
}
