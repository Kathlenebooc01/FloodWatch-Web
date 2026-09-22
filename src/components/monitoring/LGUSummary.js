"use client"
import React, { useState, useEffect } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import { MessageSquare, CircleAlert } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function LGUSummary() {
  const [pendingReportsCount, setPendingReportsCount] = useState(0)
  const [pendingDistressCount, setPendingDistressCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCounts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    const [reportsRes, distressRes] = await Promise.all([
      // Fetch exact count of incident_report with Ready_For_LGU (checking common casing variations)
      supabase
        .from("incident_report")
        .select("report_id", { count: "exact" })
        .in("status", ["Ready_For_LGU", "Ready_for_LGU", "ready_for_lgu"]),

      // Fetch exact count of distress_signals with Pending status
      supabase
        .from("distress_signals")
        .select("distress_id", { count: "exact" })
        .in("status", ["Pending", "pending", "PENDING"]),
    ]);

    if (reportsRes.error) {
      console.error("🚨 Error fetching pending report count:", reportsRes.error.message);
    } else {
      setPendingReportsCount(reportsRes.count || 0);
    }

    if (distressRes.error) {
      console.error("🚨 Error fetching distress signal count:", distressRes.error.message);
    } else {
      setPendingDistressCount(distressRes.count || 0);
    }

    if (showLoading) setIsLoading(false);
  };

  useEffect(() => {
    fetchCounts(true);

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

    // 2. Background Auto-Polling Interval (synchronize silently every 4 seconds)
    const autoRefreshInterval = setInterval(() => {
      fetchCounts(false);
    }, 4000);

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
            Pending Report
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
            LGU with pending report (Ready For LGU)
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
