"use client"
import React, { useState, useEffect } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import { MessageSquare, CircleAlert } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

// In-memory module cache for instant display when switching tabs
let cachedSummary = null;

const getInitialSummary = () => {
  if (cachedSummary) return cachedSummary;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("floodwatch_lgu_summary");
      if (stored) {
        cachedSummary = JSON.parse(stored);
        return cachedSummary;
      }
    } catch (e) {}
  }
  return null;
};

export default function LGUSummary() {
  const initial = getInitialSummary();
  const [pendingReportsCount, setPendingReportsCount] = useState(() => initial?.reportsCount ?? 0)
  const [pendingDistressCount, setPendingDistressCount] = useState(() => initial?.distressCount ?? 0)
  const [isLoading, setIsLoading] = useState(() => !initial)

  const fetchCounts = async (showLoading = true) => {
    if (showLoading && !cachedSummary) setIsLoading(true);

    try {
      const [reportsRes, distressRes] = await Promise.all([
        supabase
          .from("incident_report")
          .select("report_id, profiles!user_id!inner(role)", { count: "exact", head: true })
          .neq("profiles.role", "citizen")
          .in("status", ["Ready_For_LGU", "Ready_for_LGU", "ready_for_lgu", "Pending_AI", "pending_ai", "Pending", "pending"]),

        // Fetch exact count of distress_signals with Pending status
        supabase
          .from("distress_signals")
          .select("distress_id", { count: "exact", head: true })
          .in("status", ["Pending", "pending", "PENDING"]),
      ]);

      const repCount = reportsRes.error ? (cachedSummary?.reportsCount ?? 0) : (reportsRes.count || 0);
      const disCount = distressRes.error ? (cachedSummary?.distressCount ?? 0) : (distressRes.count || 0);

      const updatedSummary = { reportsCount: repCount, distressCount: disCount };
      cachedSummary = updatedSummary;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("floodwatch_lgu_summary", JSON.stringify(updatedSummary));
        } catch (e) {}
      }

      setPendingReportsCount(repCount);
      setPendingDistressCount(disCount);
    } catch (err) {
      console.error("🚨 Error fetching summary counts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Revalidate quietly in the background if cached, or show skeleton on cold start
    fetchCounts(!cachedSummary);

    // 1. Realtime subscriptions for instant push notifications
    const summaryChannel = supabase
      .channel("lgu-summary-realtime-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_report" }, () => {
        fetchCounts(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "distress_signals" }, () => {
        fetchCounts(false);
      })
      .subscribe();

    // 2. Background Auto-Polling Interval (synchronize silently every 60 seconds)
    const autoRefreshInterval = setInterval(() => {
      fetchCounts(false);
    }, 60000);

    return () => {
      supabase.removeChannel(summaryChannel);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* ── Pending Incident Reports Card ── */}
      <GeneralCard className="p-5 grid gap-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center">
          <CardSubHeader className="text-gray-500 font-extrabold uppercase tracking-wider !mb-0">
            Pending Utility Report
          </CardSubHeader>
          <div className="summary-data-icon-orange shadow-xs">
            <MessageSquare className="size-5" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded-lg my-1" />
          ) : (
            <CardHeader className="text-3xl font-black text-gray-800">
              {pendingReportsCount}
            </CardHeader>
          )}
          <CardBasedText className="text-amber-500 font-bold text-xs mt-0.5">
            LGU with pending reports
          </CardBasedText>
        </div>
      </GeneralCard>

      {/* ── Pending Distress Signals Card ── */}
      <GeneralCard className="p-5 grid gap-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center">
          <CardSubHeader className="text-gray-500 font-extrabold uppercase tracking-wider !mb-0">
            Distress Signals
          </CardSubHeader>
          <div className="summary-data-icon-red shadow-xs">
            <CircleAlert className="size-5" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded-lg my-1" />
          ) : (
            <CardHeader className="text-3xl font-black text-gray-800">
              {pendingDistressCount}
            </CardHeader>
          )}
          <CardBasedText className="text-red-500 font-bold text-xs mt-0.5">
            LGU with Pending distress signals
          </CardBasedText>
        </div>
      </GeneralCard>
    </section>
  );
}
