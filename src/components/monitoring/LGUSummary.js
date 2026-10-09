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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [reportsRes, distressRes] = await Promise.all([
          supabase
            .from("incident_report")
            .select("report_id, hazard_type, report_type, description, status")
            .in("status", [
              "Ready_For_LGU", "Ready_for_LGU", "ready_for_lgu", 
              "Pending_AI", "pending_ai", "Pending", "pending", 
              "Under_Review", "under_review", "Submitted", "submitted"
            ]),

          supabase
            .from("distress_signals")
            .select("distress_id", { count: "exact", head: true })
            .in("status", ["Pending", "pending", "PENDING"]),
        ]);

        if (!isMounted) return;

        const situationalPending = (reportsRes.data || []).filter((r) => {
          const h = (r.hazard_type || "").toLowerCase();
          const t = (r.report_type || "").toLowerCase();
          const d = (r.description || "").toLowerCase();
          return h.includes("situational") || t.includes("situational") || d.includes("field status") || d.includes("pending escalation");
        });

        const repCount = reportsRes.error ? (cachedSummary?.reportsCount ?? 0) : situationalPending.length;
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
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    // 1. Realtime subscriptions for instant push notifications
    const summaryChannel = supabase
      .channel("lgu-summary-realtime-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_report" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "distress_signals" }, () => {
        loadData();
      })
      .subscribe();

    // 2. Background Auto-Polling Interval (synchronize silently every 15 seconds)
    const autoRefreshInterval = setInterval(() => {
      loadData();
    }, 15000);

    return () => {
      isMounted = false;
      supabase.removeChannel(summaryChannel);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* ── Pending Incident Reports Card ── */}
      <GeneralCard className="p-5 grid gap-4 border border-gray-100 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
        <div className="flex justify-between items-center">
          <CardSubHeader className="text-gray-400 font-extrabold uppercase tracking-wider text-xs !mb-0">
            PENDING UTILITY REPORT
          </CardSubHeader>
          <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 shadow-xs">
            <MessageSquare className="size-5" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded-lg my-1" />
          ) : (
            <CardHeader className="text-3xl font-black text-gray-900">
              {pendingReportsCount}
            </CardHeader>
          )}
          <CardBasedText className="text-amber-500 font-bold text-xs mt-0.5">
            LGU with pending report (Ready For LGU)
          </CardBasedText>
        </div>
      </GeneralCard>

      {/* ── Pending Distress Signals Card ── */}
      <GeneralCard className="p-5 grid gap-4 border border-gray-100 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
        <div className="flex justify-between items-center">
          <CardSubHeader className="text-gray-400 font-extrabold uppercase tracking-wider text-xs !mb-0">
            DISTRESS SIGNALS
          </CardSubHeader>
          <div className="size-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-xs">
            <CircleAlert className="size-5" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded-lg my-1" />
          ) : (
            <CardHeader className="text-3xl font-black text-gray-900">
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
