"use client"
import React, { useState, useEffect } from "react"
import TableScrollWrapper from "@/components/table/TableScrollWrapper"
import Table from "@/components/table/Table"
import DataTable from "@/components/table/DataTable"
import TableHead from "@/components/table/TableHead"
import Th from "@/components/table/Th"
import TableRow from "@/components/table/TableRow"
import TableData from "@/components/table/TableData"
import TableDataMuted from "@/components/table/TableDataMuted"
import TableDataAction from "@/components/table/TableDataAction"
import ToogleButtonLayout from "@/components/button/ToogleButtonLayout"
import ToogleButton from "@/components/button/ToogleButton"
import DropwDown from "@/components/button/DropwDown"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import SideModal from "@/components/Modal/SideModal"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { supabase } from "@/supabase/util/supabase"
import { ChevronRight, X, ShieldAlert, CheckCircle2, AlertTriangle, MapPin, Calendar, MessageSquare, Check, Loader2 } from "lucide-react"

export default function LGUTable() {
  const [activeTab, setActiveTab] = useState("Report Table")
  
  // Dynamic State
  const [reports, setReports] = useState([])
  const [distressSignals, setDistressSignals] = useState([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [isLoadingDistress, setIsLoadingDistress] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal & Selection State
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Dropdown Filter State for Distress Signals
  const [statusFilter, setStatusFilter] = useState("All")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // 1. Fetch Dynamic Reports (Ready_For_LGU status only) + Municipality Names
  const fetchReports = async (showLoading = true) => {
    if (showLoading) setIsLoadingReports(true);

    const [reportsRes, munisRes] = await Promise.all([
      supabase
        .from("incident_report")
        .select("*")
        .eq("status", "Ready_For_LGU")
        .order("created_at", { ascending: false }),
      supabase.from("municipality_or_city").select("*")
    ]);

    if (reportsRes.error) {
      console.error("🚨 Error fetching Ready_For_LGU reports:", reportsRes.error.message);
    }

    const reportItems = reportsRes.data || [];
    const munis = munisRes.data || [];

    const processedReports = reportItems.map((rep) => {
      const muni = munis.find((m) => m.municipality_id === rep.municipality_id);
      return {
        ...rep,
        municipality_name: muni?.name || "Unknown Municipality",
      };
    });

    setReports(processedReports);
    if (showLoading) setIsLoadingReports(false);
  };

  // 2. Fetch Dynamic Distress Signals + LGU Profile Details & Municipality Names
  const fetchDistressSignals = async (showLoading = true) => {
    if (showLoading) setIsLoadingDistress(true);

    const [distressRes, profilesRes, munisRes] = await Promise.all([
      supabase.from("distress_signals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, organization_name, role, email"),
      supabase.from("municipality_or_city").select("*")
    ]);

    if (distressRes.error) {
      console.error("🚨 Error fetching distress_signals:", distressRes.error.message);
    }

    const signalItems = distressRes.data || [];
    const profiles = profilesRes.data || [];
    const munis = munisRes.data || [];

    const processedSignals = signalItems.map((sig) => {
      const profile = profiles.find((p) => p.id === sig.profile_id);
      const muni = munis.find((m) => m.municipality_id === sig.municipality_id);
      return {
        ...sig,
        lgu_name: profile?.organization_name || profile?.full_name || `LGU Unit (${sig.profile_id ? sig.profile_id.substring(0, 6) : 'Admin'})`,
        municipality_name: muni?.name || "Unknown Municipality",
      };
    });

    setDistressSignals(processedSignals);
    
    // Refresh selected signal if open in modal
    if (selectedSignal) {
      const updatedSelect = processedSignals.find((s) => s.distress_id === selectedSignal.distress_id);
      if (updatedSelect) setSelectedSignal(updatedSelect);
    }

    if (showLoading) setIsLoadingDistress(false);
  };

  useEffect(() => {
    // Initial fetch with loading skeletons
    fetchReports(true);
    fetchDistressSignals(true);

    // 3. Realtime Subscriptions for immediate push notifications
    const reportChannel = supabase
      .channel("lgu-auto-fetch-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_report" }, (payload) => {
        console.log("⚡ [Realtime Auto-Fetch] Change detected in incident_report:", payload);
        fetchReports(false);
      })
      .subscribe();

    const distressChannel = supabase
      .channel("lgu-auto-fetch-distress")
      .on("postgres_changes", { event: "*", schema: "public", table: "distress_signals" }, (payload) => {
        console.log("⚡ [Realtime Auto-Fetch] Change detected in distress_signals:", payload);
        fetchDistressSignals(false);
      })
      .subscribe();

    // 4. Background Auto-Polling Interval (Failsafe synchronization every 4 seconds)
    // Ensures tables auto-update instantly even if Postgres realtime broadcast is disabled in database settings
    const autoFetchInterval = setInterval(() => {
      fetchReports(false);
      fetchDistressSignals(false);
    }, 4000);

    return () => {
      supabase.removeChannel(reportChannel);
      supabase.removeChannel(distressChannel);
      clearInterval(autoFetchInterval);
    };
  }, []);

  // Filter for Distress Signals Table based on dropdown option
  const displayedDistressSignals = distressSignals.filter((item) => {
    if (statusFilter === "All") return true;
    return item.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  // Handler for opening distress signal details in side modal
  const handleOpenModal = (item) => {
    setSelectedSignal(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSignal(null);
  };

  // Handler for live database status transition in Side Modal (Pending -> Acknowledged -> Resolved)
  const handleStatusTransition = async (targetStatus) => {
    if (!selectedSignal || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id || null;
      const now = new Date().toISOString();

      const updateData = { status: targetStatus };
      if (targetStatus === "Acknowledged") {
        updateData.acknowledged_at = now;
        if (reviewerId) updateData.acknowledged_by = reviewerId;
      }

      const { error } = await supabase
        .from("distress_signals")
        .update(updateData)
        .eq("distress_id", selectedSignal.distress_id);

      if (error) {
        console.error("🚨 Error updating distress signal status:", error.message);
      } else {
        await fetchDistressSignals(false);
      }
    } catch (err) {
      console.error("Unexpected error modifying distress signal:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper for Distress Signals (No animation on Pending)
  const getDistressStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return <span className="bg-green-500/10 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Resolved</span>;
      case "acknowledged":
        return <span className="bg-blue-500/10 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Acknowledged</span>;
      case "pending":
      default:
        return <span className="bg-amber-500/10 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Pending</span>;
    }
  };

  return (
    <div className="grid gap-4">
      {/* ── Header with Flex & Justify-Between Toggle ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-primary" />
          <CardSubHeader className="!mb-0 leading-none text-gray-800 font-extrabold text-lg">
            {activeTab === "Report Table" ? "LGU Incident Readiness Monitor" : "LGU Emergency Distress Signals"}
          </CardSubHeader>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* ── Filter Dropdown (Displayed only on Distress Signals tab) ── */}
          {activeTab === "Distress Signals" && (
            <div className="relative">
              <DropwDown 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="hover:bg-gray-100 border border-gray-200/80 rounded-xl px-3 transition-all"
              >
                {statusFilter === "All" ? "Filter: All Statuses" : `Status: ${statusFilter}`}
              </DropwDown>

              {/* Floating Dropdown Menu */}
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-30 transition-all">
                    <div className="px-3 py-1.5 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                      Filter Status
                    </div>
                    {["All", "Pending", "Acknowledged", "Resolved"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-gray-50 flex items-center justify-between transition-colors ${
                          statusFilter === status ? "text-primary bg-primary/5" : "text-gray-700"
                        }`}
                      >
                        <span>{status === "All" ? "All Statuses" : status}</span>
                        {statusFilter === status && <Check className="size-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Toggle Buttons ── */}
          <ToogleButtonLayout className="w-full lg:w-lg">
            <ToogleButton
              active={activeTab === "Report Table"}
              className={activeTab === "Report Table" ? "button-toogle-active" : ""}
              onClick={() => {
                setActiveTab("Report Table");
                setIsFilterOpen(false);
              }}
            >
              Report Table
            </ToogleButton>
            <ToogleButton
              active={activeTab === "Distress Signals"}
              className={activeTab === "Distress Signals" ? "button-toogle-active" : ""}
              onClick={() => setActiveTab("Distress Signals")}
            >
              Distress Signals
            </ToogleButton>
          </ToogleButtonLayout>
        </div>
      </div>

      {/* ── Table Container ── */}
      <Table>
        <TableScrollWrapper>
          <DataTable>
            {activeTab === "Report Table" ? (
              // ── 1. REPORT TABLE (Ready_For_LGU Only | No Action Column) ──
              <>
                <TableHead>
                  <tr>
                    <Th>Municipality/City</Th>
                    <Th>Created At</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {isLoadingReports ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`skeleton-report-${i}`}>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                      </TableRow>
                    ))
                  ) : reports.length > 0 ? (
                    reports.map((item) => (
                      <TableRow key={item.report_id || Math.random()}>
                        <TableData className="font-bold text-gray-800">{item.municipality_name}</TableData>
                        <TableDataMuted className="truncate max-w-[200px]">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "—"}
                        </TableDataMuted>
                        <TableData>
                          <span className="summary-data-icon-purple px-3 py-1 text-xs font-semibold rounded-full border border-purple-200/60 inline-flex items-center gap-1.5 shadow-xs">
                            <span className="size-1.5 rounded-full bg-purple-600 animate-pulse" />
                            {(item.status || "Ready_For_LGU").replace(/_/g, " ")}
                          </span>
                        </TableData>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableDataMuted colSpan={3} className="text-center py-12">
                        No reports ready for LGU action at this time.
                      </TableDataMuted>
                    </TableRow>
                  )}
                </tbody>
              </>
            ) : (
              // ── 2. DISTRESS SIGNALS TABLE (LGU | Municipality/City | Created at | Status | Action) ──
              <>
                <TableHead>
                  <tr>
                    <Th>LGU</Th>
                    <Th>Municipality/City</Th>
                    <Th>Created At</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {isLoadingDistress ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`skeleton-distress-${i}`}>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableDataAction><div style={{ width: "32px", height: "32px" }} /></TableDataAction>
                      </TableRow>
                    ))
                  ) : displayedDistressSignals.length > 0 ? (
                    displayedDistressSignals.map((item) => (
                      <TableRow key={item.distress_id || Math.random()}>
                        <TableData className="font-bold text-gray-800">{item.lgu_name}</TableData>
                        <TableDataMuted>{item.municipality_name}</TableDataMuted>
                        <TableDataMuted>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "—"}
                        </TableDataMuted>
                        <TableData>{getDistressStatusBadge(item.status)}</TableData>
                        <TableDataAction>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="modal-icon-button"
                            aria-label="View Distress Details"
                          >
                            <ChevronRight className="size-5 text-gray-500" />
                          </button>
                        </TableDataAction>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableDataMuted colSpan={5} className="text-center py-12">
                        {statusFilter === "All" 
                          ? "No active distress signals recorded in the database." 
                          : `No distress signals found with status "${statusFilter}".`}
                      </TableDataMuted>
                    </TableRow>
                  )}
                </tbody>
              </>
            )}
          </DataTable>
        </TableScrollWrapper>
      </Table>

      {/* ── Side Modal for Distress Signal Action ── */}
      {isModalOpen && selectedSignal && (
        <>
          {/* Transparent Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs" onClick={handleCloseModal} />
          
          <SideModal className="z-50 !w-[350px] md:!w-[420px]">
            <div className="p-6 flex flex-col h-full bg-white justify-between">
              
              {/* Modal Content */}
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                    <CardSubHeader className="!mb-0 font-extrabold text-gray-800">
                      Distress Signal Details
                    </CardSubHeader>
                  </div>
                  <button onClick={handleCloseModal} className="modal-icon-button bg-gray-100 hover:bg-gray-200">
                    <X className="size-5 text-gray-600" />
                  </button>
                </div>

                {/* Body Details */}
                <div className="space-y-5">
                  {/* Primary Info Box */}
                  <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                    <div>
                      <CardBasedText className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Originating LGU Unit
                      </CardBasedText>
                      <div className="text-base font-extrabold text-gray-900">{selectedSignal.lgu_name}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                      <div>
                        <CardBasedText className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Municipality/City
                        </CardBasedText>
                        <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" /> {selectedSignal.municipality_name}
                        </div>
                      </div>
                      <div>
                        <CardBasedText className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Signal Status
                        </CardBasedText>
                        <div className="mt-0.5">
                          {getDistressStatusBadge(selectedSignal.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remarks Box */}
                  <div>
                    <CardBasedText className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <MessageSquare className="size-4 text-primary" /> Emergency Remarks
                    </CardBasedText>
                    <div className="bg-amber-50/50 text-amber-950 p-4 rounded-xl border border-amber-200/80 text-sm font-medium leading-relaxed">
                      {selectedSignal.remarks || "No supplementary remarks provided."}
                    </div>
                  </div>

                  {/* Timestamp & Acknowledgment Audit */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="size-3.5 text-gray-400" /> Transmitted At:
                      </span>
                      <span className="font-bold text-gray-800">
                        {selectedSignal.created_at ? new Date(selectedSignal.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unknown"}
                      </span>
                    </div>
                    {selectedSignal.acknowledged_at && (
                      <div className="flex items-center justify-between text-green-700 pt-2 border-t border-gray-200/60">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="size-3.5" /> Acknowledged At:
                        </span>
                        <span className="font-bold">
                          {new Date(selectedSignal.acknowledged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions (Dynamic button based on constraint status) */}
              <div className="pt-4 mt-6 border-t border-gray-100 flex flex-col gap-2 shrink-0">
                {selectedSignal.status?.toLowerCase() === "pending" && (
                  <button
                    onClick={() => handleStatusTransition("Acknowledged")}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Acknowledge Distress Signal
                  </button>
                )}

                {selectedSignal.status?.toLowerCase() === "acknowledged" && (
                  <button
                    onClick={() => handleStatusTransition("Resolved")}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Mark as Resolved
                  </button>
                )}

                {selectedSignal.status?.toLowerCase() === "resolved" && (
                  <div className="text-center py-2 bg-green-50 text-green-800 font-bold text-xs rounded-xl border border-green-200">
                    This emergency signal has been resolved.
                  </div>
                )}
              </div>

            </div>
          </SideModal>
        </>
      )}
    </div>
  );
}
