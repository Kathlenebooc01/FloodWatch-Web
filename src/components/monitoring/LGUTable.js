"use client"
import React, { useState, useEffect, useRef } from "react"
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
import TablePagination from "@/components/table/TablePagination"
import { supabase } from "@/supabase/util/supabase"
import { ChevronRight, X, ShieldAlert, CheckCircle2, AlertTriangle, MapPin, Calendar, MessageSquare, Check, Loader2, FileCheck2, Clock, XCircle, Eye, BadgeCheck, FileDown, FileText } from "lucide-react"

// In-memory module cache for instant display when switching tabs
let cachedReports = null;
let cachedDistressSignals = null;

const getInitialReports = () => {
  if (cachedReports) return cachedReports;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("floodwatch_lgu_reports");
      if (stored) {
        cachedReports = JSON.parse(stored);
        return cachedReports;
      }
    } catch (e) {}
  }
  return [];
};

const getInitialDistressSignals = () => {
  if (cachedDistressSignals) return cachedDistressSignals;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("floodwatch_lgu_distress");
      if (stored) {
        cachedDistressSignals = JSON.parse(stored);
        return cachedDistressSignals;
      }
    } catch (e) {}
  }
  return [];
};

export default function LGUTable() {
  const [activeTab, setActiveTab] = useState("Report Table")
  
  // Dynamic State with instant cache
  const initialReports = getInitialReports();
  const initialDistress = getInitialDistressSignals();
  const [reports, setReports] = useState(initialReports)
  const [distressSignals, setDistressSignals] = useState(initialDistress)
  const [isLoadingReports, setIsLoadingReports] = useState(() => initialReports.length === 0)
  const [isLoadingDistress, setIsLoadingDistress] = useState(() => initialDistress.length === 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  // Pagination State
  const [reportPage, setReportPage] = useState(1)
  const [distressPage, setDistressPage] = useState(1)
  const itemsPerPage = 10

  // Modal & Selection State
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  // Refs to keep modal state in sync inside realtime/interval closures
  const selectedReportRef = useRef(null)

  // Dropdown Filter State for Distress Signals
  const [statusFilter, setStatusFilter] = useState("All")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    setDistressPage(1)
  }, [statusFilter])

  // 1. Fetch Dynamic Reports (Fast single query with PostgREST join)
  const fetchReports = async (showLoading = true) => {
    if (showLoading && (!cachedReports || cachedReports.length === 0)) {
      setIsLoadingReports(true);
    }

    try {
      const { data, error } = await supabase
        .from("incident_report")
        .select("*, profiles!user_id!inner(role), municipality_or_city:municipality_id(name)")
        .neq("profiles.role", "citizen")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("🚨 Error fetching reports:", error.message);
        return;
      }

      const reportItems = data || [];
      const processedReports = reportItems.map((rep) => ({
        ...rep,
        municipality_name: rep.municipality_or_city?.name || "Unknown Municipality",
      }));

      cachedReports = processedReports;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("floodwatch_lgu_reports", JSON.stringify(processedReports));
        } catch (e) {}
      }

      setReports(processedReports);

      // Sync open report modal in real-time (no refresh needed)
      if (selectedReportRef.current) {
        const updatedRep = processedReports.find((r) => r.report_id === selectedReportRef.current.report_id);
        if (updatedRep) setSelectedReport(updatedRep);
      }
    } catch (err) {
      console.error("🚨 Error in fetchReports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // 2. Fetch Dynamic Distress Signals (Fast single query with PostgREST joins)
  const fetchDistressSignals = async (showLoading = true) => {
    if (showLoading && (!cachedDistressSignals || cachedDistressSignals.length === 0)) {
      setIsLoadingDistress(true);
    }

    try {
      const { data, error } = await supabase
        .from("distress_signals")
        .select("*, profiles:profile_id(id, full_name, organization_name, role, email), municipality_or_city:municipality_id(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("🚨 Error fetching distress_signals:", error.message);
        return;
      }

      const signalItems = data || [];
      const processedSignals = signalItems.map((sig) => {
        const profile = sig.profiles;
        return {
          ...sig,
          lgu_name: profile?.organization_name || profile?.full_name || (sig.profile_id ? `LGU Unit (${sig.profile_id.substring(0, 6)})` : 'Admin'),
          municipality_name: sig.municipality_or_city?.name || "Unknown Municipality",
        };
      });

      cachedDistressSignals = processedSignals;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("floodwatch_lgu_distress", JSON.stringify(processedSignals));
        } catch (e) {}
      }

      setDistressSignals(processedSignals);
      
      // Refresh selected signal if open in modal
      if (selectedSignal) {
        const updatedSelect = processedSignals.find((s) => s.distress_id === selectedSignal.distress_id);
        if (updatedSelect) setSelectedSignal(updatedSelect);
      }
    } catch (err) {
      console.error("🚨 Error in fetchDistressSignals:", err);
    } finally {
      setIsLoadingDistress(false);
    }
  };

  useEffect(() => {
    // Initial fetch: quiet background fetch if already cached, otherwise show skeleton
    fetchReports(initialReports.length === 0);
    fetchDistressSignals(initialDistress.length === 0);

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

    // 4. Background Auto-Polling Interval (Failsafe synchronization every 60 seconds)
    const autoFetchInterval = setInterval(() => {
      fetchReports(false);
      fetchDistressSignals(false);
    }, 60000);

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

  const handleOpenModal = (item) => {
    setSelectedSignal(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSignal(null);
  };

  const handleOpenReportModal = (item) => {
    selectedReportRef.current = item;
    setSelectedReport(item);
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    selectedReportRef.current = null;
    setIsReportModalOpen(false);
    setSelectedReport(null);
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

  // Handler to Accept an Incident Report (Admin action → LGU app sees "Accepted")
  const handleAcceptReport = async () => {
    if (!selectedReport || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id || null;
      const now = new Date().toISOString();

      const updatePayload = {
        status: "Verified",
      };

      const { error } = await supabase
        .from("incident_report")
        .update(updatePayload)
        .eq("report_id", selectedReport.report_id);

      if (error) {
        console.error("🚨 Error accepting report:", error.message);
      } else {
        // Create notification for the user
        if (selectedReport.user_id) {
          await supabase.from("notifications").insert({
            user_id: selectedReport.user_id,
            title: "Report Verified",
            message: `Your incident report for ${(selectedReport.hazard_type || "incident").replace(/_/g, " ")} has been verified and accepted by the LGU.`,
            type: "Updates",
            target_role: "lgu"
          });
        }

        // Instantly update modal state + table row — no refresh needed
        const updated = { ...selectedReportRef.current, status: "Verified" };
        selectedReportRef.current = updated;
        setSelectedReport(updated);
        setReports((prev) => {
          const next = prev.map((r) => r.report_id === updated.report_id ? updated : r);
          cachedReports = next;
          if (typeof window !== "undefined") {
            try { sessionStorage.setItem("floodwatch_lgu_reports", JSON.stringify(next)); } catch (e) {}
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Unexpected error accepting report:", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handler to Reject an Incident Report
  const handleRejectReport = async () => {
    if (!selectedReport || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      const { error } = await supabase
        .from("incident_report")
        .update({ status: "Rejected" })
        .eq("report_id", selectedReport.report_id);

      if (error) {
        console.error("🚨 Error rejecting report:", error.message);
      } else {
        // Create notification for the user
        if (selectedReport.user_id) {
          await supabase.from("notifications").insert({
            user_id: selectedReport.user_id,
            title: "Report Rejected",
            message: `Your incident report for ${(selectedReport.hazard_type || "incident").replace(/_/g, " ")} was reviewed but rejected.`,
            type: "Updates",
            target_role: "lgu"
          });
        }

        // Instantly update modal state + table row — no refresh needed
        const updated = { ...selectedReportRef.current, status: "Rejected" };
        selectedReportRef.current = updated;
        setSelectedReport(updated);
        setReports((prev) => {
          const next = prev.map((r) => r.report_id === updated.report_id ? updated : r);
          cachedReports = next;
          if (typeof window !== "undefined") {
            try { sessionStorage.setItem("floodwatch_lgu_reports", JSON.stringify(next)); } catch (e) {}
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Unexpected error rejecting report:", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Status Badge Helper for Distress Signals (Cleans all underscores)
  const getDistressStatusBadge = (status) => {
    const raw = status || "Pending";
    const clean = raw.replace(/_/g, " ");
    switch (clean.toLowerCase()) {
      case "resolved":
        return <span className="bg-green-500/10 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Resolved</span>;
      case "acknowledged":
        return <span className="bg-blue-500/10 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Acknowledged</span>;
      case "pending":
      default:
        return <span className="bg-amber-500/10 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">{clean}</span>;
    }
  };

  // Status Badge Helper for Reports
  // Pending_AI / Pending_Ai / pending_ai → always shown as just "Pending"
  const getReportStatusBadge = (status) => {
    const raw = status || "Pending";
    const s = raw.toLowerCase();

    if (s === "accepted") {
      return (
        <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-xs">
          <BadgeCheck className="size-3.5" />
          Accepted
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="bg-red-500/10 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-xs">
          <XCircle className="size-3.5" />
          Rejected
        </span>
      );
    }
    if (s.includes("verified") || s.includes("resolved") || s.includes("approved") || s.includes("completed")) {
      const clean = raw.replace(/_/g, " ");
      return (
        <span className="bg-green-500/10 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-xs">
          <span className="size-1.5 rounded-full bg-green-500" />
          {clean}
        </span>
      );
    }
    // Pending_AI, pending_ai, Pending_ai, pending → all show as "Pending"
    if (s.includes("pending") || s.includes("_ai") || s.includes("review")) {
      return (
        <span className="bg-amber-500/10 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-xs">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
    }
    if (s.includes("ready") || s.includes("lgu")) {
      const clean = raw.replace(/_/g, " ");
      return (
        <span className="summary-data-icon-purple px-3 py-1 text-xs font-semibold rounded-full border border-purple-200/60 inline-flex items-center gap-1.5 shadow-xs">
          <span className="size-1.5 rounded-full bg-purple-600 animate-pulse" />
          {clean}
        </span>
      );
    }
    const clean = raw.replace(/_/g, " ");
    return (
      <span className="bg-blue-500/10 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-xs">
        <span className="size-1.5 rounded-full bg-blue-500" />
        {clean}
      </span>
    );
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
              // ── 1. REPORT TABLE (All Reports with formatted status and action modal) ──
              <>
                <TableHead>
                  <tr>
                    <Th>Municipality/City</Th>
                    <Th>Hazard / Type</Th>
                    <Th>Created At</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {isLoadingReports ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`skeleton-report-${i}`}>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableDataAction><div style={{ width: "32px", height: "32px" }} /></TableDataAction>
                      </TableRow>
                    ))
                  ) : reports.length > 0 ? (
                    reports
                      .slice((reportPage - 1) * itemsPerPage, reportPage * itemsPerPage)
                      .map((item) => {
                          const isEscalation = (item.hazard_type || item.report_type || "").toLowerCase().includes("support escalation");
                          return (
                          <TableRow
                            key={item.report_id || Math.random()}
                            className={isEscalation ? "bg-red-50/70 border-l-4 border-l-red-500" : ""}
                          >
                            <TableData className="font-bold text-gray-800">{item.municipality_name}</TableData>
                            <TableData className={isEscalation ? "font-bold" : "text-gray-700 font-medium capitalize"}>
                              {isEscalation ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="relative flex size-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full size-2.5 bg-red-600" />
                                  </span>
                                  <span className="text-red-700 font-extrabold uppercase tracking-wide text-xs">
                                    {(item.hazard_type || item.report_type || "Incident").replace(/_/g, " ")}
                                  </span>
                                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">
                                    URGENT
                                  </span>
                                </span>
                              ) : (
                                (item.hazard_type || item.report_type || "Incident").replace(/_/g, " ")
                              )}
                            </TableData>
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
                              {getReportStatusBadge(item.status)}
                            </TableData>
                            <TableDataAction>
                              <button
                                onClick={() => handleOpenReportModal(item)}
                                className={isEscalation ? "modal-icon-button border border-red-200 hover:bg-red-50" : "modal-icon-button"}
                                aria-label="View Report Details"
                              >
                                <ChevronRight className={`size-5 ${isEscalation ? "text-red-500" : "text-gray-500"}`} />
                              </button>
                            </TableDataAction>
                          </TableRow>
                        );})
                  ) : (
                    <TableRow>
                      <TableDataMuted colSpan={5} className="text-center py-12">
                        No reports recorded at this time.
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
                    displayedDistressSignals
                      .slice((distressPage - 1) * itemsPerPage, distressPage * itemsPerPage)
                      .map((item) => (
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

        {activeTab === "Report Table" ? (
          <TablePagination
            currentPage={reportPage}
            totalItems={reports.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setReportPage}
          />
        ) : (
          <TablePagination
            currentPage={distressPage}
            totalItems={displayedDistressSignals.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setDistressPage}
          />
        )}
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
      {/* ── Side Modal for Incident Report Details ── */}
      {isReportModalOpen && selectedReport && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={handleCloseReportModal} />
          
          <SideModal className="z-50 !w-[380px] md:!w-[460px]">
            <div className="flex flex-col h-full bg-white">

              {/* ── Modal Header with gradient accent ── */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <FileCheck2 className="size-4 text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Incident Report</span>
                    </div>
                    <h2 className="text-lg font-extrabold text-white leading-tight mt-2 capitalize">
                      {(selectedReport.hazard_type || selectedReport.report_type || "Incident Report").replace(/_/g, " ")}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 text-white/60 text-xs">
                      <MapPin className="size-3.5" />
                      <span className="font-medium">{selectedReport.municipality_name}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseReportModal}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0 ml-3 mt-0.5"
                  >
                    <X className="size-4.5 text-white" />
                  </button>
                </div>

                {/* Status Row */}
                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-white/10">
                  <div className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">Current Status</div>
                  {getReportStatusBadge(selectedReport.status)}
                </div>
              </div>

              {/* ── Accepted Banner (shown when accepted) ── */}
              {selectedReport.status?.toLowerCase() === "accepted" && (
                <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 shrink-0">
                  <div className="p-1.5 bg-emerald-100 rounded-lg shrink-0">
                    <BadgeCheck className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-emerald-800">Report Accepted by Admin</div>
                    <div className="text-xs text-emerald-600 mt-0.5">
                      The LGU has been notified. This report is now visible as accepted in the mobile app.
                    </div>
                    {selectedReport.accepted_at && (
                      <div className="text-[11px] text-emerald-500 font-semibold mt-1.5 flex items-center gap-1">
                        <Clock className="size-3" />
                        Accepted on {new Date(selectedReport.accepted_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Rejected Banner ── */}
              {selectedReport.status?.toLowerCase() === "rejected" && (
                <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-3 shrink-0">
                  <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
                    <XCircle className="size-4 text-red-500" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-red-800">Report Rejected</div>
                    <div className="text-xs text-red-600 mt-0.5">
                      This report has been marked as rejected and will not be processed further.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Body Details (scrollable) ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Smart Attachment — handles Image and PDF */}
                {selectedReport.image_url && (() => {
                  const url = selectedReport.image_url;
                  const isPdf = url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('application/pdf');
                  const fileName = url?.split('/').pop()?.split('?')[0] || 'attachment';

                  if (isPdf) {
                    return (
                      <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="size-3.5" /> PDF Attachment
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 flex items-center gap-4">
                          {/* PDF Icon */}
                          <div className="shrink-0 bg-red-100 rounded-xl p-3">
                            <FileText className="size-7 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold text-gray-800 truncate">{decodeURIComponent(fileName)}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">PDF Document</div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {/* View in browser */}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all"
                            >
                              <Eye className="size-3.5" /> View
                            </a>
                            {/* Download */}
                            <a
                              href={url}
                              download={fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                            >
                              <FileDown className="size-3.5" /> Download
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default: Image preview
                  return (
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Eye className="size-3.5" /> Photo Evidence
                        <span className="text-[10px] text-primary font-semibold ml-auto">click to open ↗</span>
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-primary bg-gray-100 max-h-52 relative shadow-sm transition-all group cursor-pointer"
                      >
                        <img
                          src={url}
                          alt="Report attachment"
                          className="w-full h-full object-cover max-h-52 group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            // If image fails to load, try showing as a generic file download instead
                            e.target.closest('a').outerHTML = `
                              <a href="${url}" target="_blank" rel="noopener noreferrer"
                                class="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all">
                                <span class="text-sm font-bold text-gray-700">📎 Open Attachment</span>
                              </a>`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Eye className="size-3.5" /> View Full Image
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })()}

                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" /> Description & Situation
                  </div>
                  <div className="bg-gray-50 text-gray-800 p-4 rounded-2xl border border-gray-200/80 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedReport.description ? (
                      selectedReport.description.split(/(\[Attached Document: .*?\])/g).map((part, index) => {
                        const match = part.match(/\[Attached Document: (.*?)\]/);
                        if (match) {
                          const fileName = match[1];
                          // Assuming the LGU app uploads to "incident-reports" bucket
                          const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/incident-reports/${encodeURIComponent(fileName)}`;
                          return (
                            <a 
                              key={index} 
                              href={fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 my-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors w-max font-bold shadow-sm"
                            >
                              <FileDown className="size-4" />
                              {fileName} (Click to View/Download)
                            </a>
                          );
                        }
                        return <span key={index}>{part}</span>;
                      })
                    ) : (
                      "No description provided by the LGU."
                    )}
                  </div>
                </div>

                {/* Additional Data Fields */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Severity / Level if present */}
                  {(selectedReport.severity || selectedReport.level) && (
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Severity</div>
                      <div className="text-sm font-extrabold text-gray-800 capitalize">
                        {(selectedReport.severity || selectedReport.level || "—").replace(/_/g, " ")}
                      </div>
                    </div>
                  )}

                  {/* Affected Count if present */}
                  {selectedReport.affected_count !== undefined && selectedReport.affected_count !== null && (
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Affected</div>
                      <div className="text-sm font-extrabold text-gray-800">{selectedReport.affected_count}</div>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Calendar className="size-3.5 text-gray-400" /> Reported At:
                    </span>
                    <span className="font-bold text-gray-800">
                      {selectedReport.created_at
                        ? new Date(selectedReport.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "Unknown"}
                    </span>
                  </div>
                  {selectedReport.accepted_at && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 pt-2 border-t border-gray-200/60">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="size-3.5" /> Accepted At:
                      </span>
                      <span className="font-bold">
                        {new Date(selectedReport.accepted_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">

                {/* Admin Accept/Reject actions – hidden when already finalized */}
                {!(["accepted", "rejected", "verified", "resolved", "approved", "completed"].some(f =>
                  selectedReport.status?.toLowerCase().includes(f)
                )) && (
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-1">
                      Admin Review Action
                    </div>

                    {/* Accept Button */}
                    <button
                      id="btn-accept-report"
                      onClick={handleAcceptReport}
                      disabled={isSubmittingReport}
                      className="w-full py-3 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff" }}
                    >
                      {isSubmittingReport ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="size-4.5" />
                      )}
                      Accept Report
                    </button>

                    {/* Reject Button */}
                    <button
                      id="btn-reject-report"
                      onClick={handleRejectReport}
                      disabled={isSubmittingReport}
                      className="w-full py-2.5 px-4 rounded-2xl font-bold text-sm transition-all border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmittingReport ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                      Reject Report
                    </button>
                  </div>
                )}

                {/* Already finalized indicators */}
                {(["accepted", "verified", "resolved", "approved", "completed"].some(f =>
                  selectedReport.status?.toLowerCase().includes(f)
                )) && (
                  <div className="mb-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 rounded-lg shrink-0">
                      <BadgeCheck className="size-4 text-emerald-600" />
                    </div>
                    <span className="font-extrabold text-sm text-emerald-800 tracking-wide uppercase">Report Accepted & Verified</span>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={handleCloseReportModal}
                  className="w-full mt-2.5 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-sm transition-all"
                >
                  Close
                </button>
              </div>

            </div>
          </SideModal>
        </>
      )}
    </div>
  );
}
