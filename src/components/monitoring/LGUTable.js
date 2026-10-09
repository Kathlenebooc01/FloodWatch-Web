"use client"
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import CardSubHeader from "@/components/cards/CardSubHeader"
import SideModal from "@/components/Modal/SideModal"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import TablePagination from "@/components/table/TablePagination"
import { supabase } from "@/supabase/util/supabase"
import { buildReportHierarchy, fetchAllIncidentReports } from "@/lib/situational-report-hierarchy.mjs"
import { getIncidentCoordinates } from "@/lib/reports/incidentCoordinates.mjs"
import { hasNewReports, newestReportTimestamp } from "@/lib/notifications/reportSeen.mjs"
import IncidentLocationMap from "./IncidentLocationMap"
import {
  ChevronRight,
  ChevronDown,
  X,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Calendar,
  Check,
  Loader2,
  XCircle,
  Eye,
  BadgeCheck,
  FileText,
  FileDown,
  Radio,
  ExternalLink,
  Phone,
  AlertOctagon
} from "lucide-react"

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

// Helper to calculate human readable relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins} mins ago`;
  if (diffInHours < 24) return `${diffInHours} hr${diffInHours > 1 ? "s" : ""} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

// Format Report ID to match INC-2026-0891 style
const formatReportId = (reportId, createdAt) => {
  if (!reportId) return "INC-2026-0001";
  const year = createdAt ? new Date(createdAt).getFullYear() : 2026;
  const cleanId = String(reportId).replace(/-/g, "").toUpperCase();
  const shortNum = cleanId.substring(0, 4);
  return `INC-${year}-${shortNum}`;
};

// Clean title by stripping [SITUATIONAL] or bracket tags
const cleanReportTitle = (text) => {
  if (!text) return "Situational Report";
  const cleaned = String(text)
    .replace(/\[SITUATIONAL\]/gi, "")
    .replace(/\[MODERATE REPORT\]/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/_/g, " ")
    .trim();
  return cleaned || "Situational Report";
};

// Check if a report is an escalation report
const isEscalationReport = (rep) => {
  const hazard = (rep.hazard_type || "").toLowerCase();
  const rType = (rep.report_type || "").toLowerCase();
  const desc = (rep.description || "").toLowerCase();

  return (
    hazard.includes("support escalation") ||
    hazard.includes("escalat") ||
    rType.includes("escalat") ||
    desc.includes("support escalation")
  );
};

// Check if a report is a situational report (excluding support escalation)
const isSituationalReport = (rep) => {
  if (isEscalationReport(rep)) return false;

  const hazard = (rep.hazard_type || "").toLowerCase();
  const rType = (rep.report_type || "").toLowerCase();
  const desc = (rep.description || "").toLowerCase();

  return (
    hazard.includes("situational") ||
    rType.includes("situational") ||
    desc.includes("field status") ||
    desc.includes("situational")
  );
};

// Calculate priority dynamically from report urgency / level
const derivePriority = (item) => {
  if (item.urgency) {
    const u = String(item.urgency).toLowerCase();
    if (u.includes("high")) return "High";
    if (u.includes("med")) return "Medium";
    if (u.includes("low")) return "Low";
    if (u.includes("urg") || u.includes("crit")) return "High";
  }
  if (item.priority) {
    const p = String(item.priority).toLowerCase();
    if (p.includes("high")) return "High";
    if (p.includes("med")) return "Medium";
    if (p.includes("low")) return "Low";
    if (p.includes("urg") || p.includes("crit")) return "High";
  }
  if (item.severity) {
    const s = String(item.severity).toLowerCase();
    if (s.includes("high")) return "High";
    if (s.includes("med")) return "Medium";
    if (s.includes("low")) return "Low";
    if (s.includes("urg") || s.includes("crit")) return "High";
  }

  const desc = (item.description || "").toLowerCase();
  if (desc.includes("urgency: high") || desc.includes("priority: high")) return "High";
  if (desc.includes("urgency: medium") || desc.includes("priority: medium")) return "Medium";
  if (desc.includes("urgency: low") || desc.includes("priority: low")) return "Low";
  if (desc.includes("high")) return "High";
  if (desc.includes("low")) return "Low";

  return "Medium";
};

// Get Priority text with color
const renderPriority = (priority) => {
  switch (priority) {
    case "High":
      return <span className="font-bold text-orange-500">High</span>;
    case "Medium":
      return <span className="font-bold text-amber-500">Medium</span>;
    case "Low":
    default:
      return <span className="font-bold text-blue-500">Low</span>;
  }
};

// Map incident type to styled badge
const renderIncidentTypeBadge = (hazardType, reportType, isRedTheme = false) => {
  const type = cleanReportTitle(hazardType || reportType || "Situational Report");

  if (isRedTheme) {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border bg-red-100 text-red-700 border-red-200 capitalize whitespace-nowrap shadow-2xs">
        {type}
      </span>
    );
  }

  const lower = type.toLowerCase();
  let badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
  if (lower.includes("landslide")) {
    badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
  } else if (lower.includes("rescue") || lower.includes("stranded") || lower.includes("escalat")) {
    badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
  } else if (lower.includes("power") || lower.includes("shelter")) {
    badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
  } else if (lower.includes("infra") || lower.includes("road") || lower.includes("debris")) {
    badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
  } else if (lower.includes("logistics") || lower.includes("clearing")) {
    badgeColor = "bg-cyan-100 text-cyan-800 border-cyan-200";
  }

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border ${badgeColor} capitalize whitespace-nowrap shadow-2xs`}>
      {type}
    </span>
  );
};

// Extract location cleanly from description or municipality
const extractLocationName = (item) => {
  if (item.description) {
    const locMatch = item.description.match(/Location:\s*([^\n\r]+)/i);
    if (locMatch && locMatch[1]?.trim()) {
      return locMatch[1].trim();
    }
  }
  if (item.specific_location_name) return item.specific_location_name;
  if (item.municipality_name) return item.municipality_name;
  return "Lapu-Lapu City";
};

// Extract reporter initials
const getInitials = (name) => {
  if (!name) return "OF";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Parse situation description for Field Status, Clean Note, and Attached Document
const parseSituationDescription = (description) => {
  if (!description) return { fieldStatus: null, note: "No situation details provided.", attachedDoc: null, linkedReportId: null };

  let fieldStatus = null;
  const statusMatch = description.match(/\[Field Status:\s*([^\]]+)\]/i);
  if (statusMatch) {
    fieldStatus = statusMatch[1].trim();
  }

  let attachedDoc = null;
  const docMatch = description.match(/\[Attached Document:\s*([^\]]+)\]/i);
  if (docMatch) {
    attachedDoc = docMatch[1].trim();
  }

  const linkedReportMatch = description.match(/\[Linked Situational Report:\s*([^\]]+)\]/i);
  const linkedReportId = linkedReportMatch?.[1].trim() || null;

  const cleanNote = description
    .replace(/\[Field Status:\s*[^\]]+\]/gi, "")
    .replace(/\[Attached Document:\s*[^\]]+\]/gi, "")
    .replace(/\[Linked Situational Report:\s*[^\]]+\]/gi, "")
    .replace(/\[MODERATE REPORT\]/gi, "")
    .replace(/\[SITUATIONAL\]/gi, "")
    .trim();

  return { fieldStatus, note: cleanNote, attachedDoc, linkedReportId };
};

// Extract all attachments from description and image_url
const getReportAttachments = (item) => {
  if (!item) return [];
  const attachments = [];
  const supabaseStorageUrl = "https://xncciaozzxoqbesfxpww.supabase.co/storage/v1/object/public/incident-reports";

  if (item.description) {
    const docMatches = item.description.matchAll(/\[Attached Document:\s*([^\]]+)\]/gi);
    for (const m of docMatches) {
      const rawFileName = m[1].trim();
      const isPdf = rawFileName.toLowerCase().endsWith(".pdf");
      const fileUrl = rawFileName.startsWith("http")
        ? rawFileName
        : `${supabaseStorageUrl}/${encodeURIComponent(rawFileName)}`;

      attachments.push({
        name: rawFileName,
        url: fileUrl,
        isPdf: isPdf
      });
    }
  }

  if (item.image_url) {
    const url = item.image_url;
    const isPdf = url.toLowerCase().includes(".pdf");
    const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Evidence_Attachment");
    if (!attachments.some((a) => a.url === url || a.name === name)) {
      attachments.push({
        name,
        url,
        isPdf
      });
    }
  }

  return attachments;
};

export default function LGUTable() {
  const [activeTab, setActiveTab] = useState("Report Table")

  // Cooldown ref to prevent real-time refetch from overwriting optimistic state after actions
  const lastActionRef = useRef(0)

  // Dynamic State with instant cache
  const initialReports = getInitialReports();
  const initialDistress = getInitialDistressSignals();
  const [reports, setReports] = useState(initialReports)
  const [distressSignals, setDistressSignals] = useState(initialDistress)
  const [isLoadingReports, setIsLoadingReports] = useState(() => initialReports.length === 0)
  const [isLoadingDistress, setIsLoadingDistress] = useState(() => initialDistress.length === 0)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [isSubmittingDistress, setIsSubmittingDistress] = useState(false)

  const [reportSeenAt, setReportSeenAt] = useState(null)
  const [reportSeenReady, setReportSeenReady] = useState(false)
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [reportLoadVersion, setReportLoadVersion] = useState(0)
  const persistedReportSeenAt = useRef(null)
  const reportSeenWriteInFlight = useRef(false)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const saved = data?.user?.user_metadata?.provincial_reports_seen_at || null
      persistedReportSeenAt.current = saved
      setReportSeenAt(saved)
      setReportSeenReady(true)
    }).catch(() => { if (active) setReportSeenReady(true) })
    return () => { active = false }
  }, [])

  const [viewedDistressIds, setViewedDistressIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("floodwatch_viewed_distress");
        return stored ? JSON.parse(stored).map(String) : [];
      } catch (e) {}
    }
    return [];
  })

  // Expand/Collapse state for Municipality Groups
  const [expandedMunicipalities, setExpandedMunicipalities] = useState({})
  const [expandedReports, setExpandedReports] = useState({})
  const [reportFetchError, setReportFetchError] = useState(null)
  const [expandedDistressMunis, setExpandedDistressMunis] = useState({})

  // Pagination State
  const [reportPage, setReportPage] = useState(1)
  const [distressPage, setDistressPage] = useState(1)
  const itemsPerPage = 8

  // Modal & Selection State
  const [selectedReport, setSelectedReport] = useState(null)
  const [resolvedMapCoordinates, setResolvedMapCoordinates] = useState(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const [repRes, disRes] = await Promise.all([
          fetchAllIncidentReports(supabase),
          supabase
            .from("distress_signals")
            .select("*, profiles:profile_id(id, full_name, organization_name, role, mobile_number, email), municipality_or_city:municipality_id(name)")
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        if (!isMounted) return;

        setReportFetchError(null);
        const allIncidentRows = repRes;
        const rawDistressRows = disRes.data || [];

        // 1. Separate Situational Reports (Report Table) vs Escalation Reports (Distress Signals)
        const situationalRows = allIncidentRows.filter(rep => isSituationalReport(rep) || rep.parent_report_id);
        const escalationRows = allIncidentRows.filter(isEscalationReport);

        // Process Situational Reports
        const processedReports = situationalRows.map((rep) => {
          const muniName = rep.municipality_or_city?.name || "Unknown municipality";

          return {
            ...rep,
            clean_title: cleanReportTitle(rep.hazard_type || rep.report_type || "Situational Report"),
            municipality_name: muniName,
            formatted_id: formatReportId(rep.report_id, rep.created_at),
            priority_level: derivePriority(rep),
            location_name: extractLocationName({ ...rep, municipality_name: muniName })
          };
        });

        // Combine Escalations from incident_report + distress_signals table
        const combinedDistress = [
          ...escalationRows.map((esc) => {
            let muniName = esc.municipality_or_city?.name || "Lapu-Lapu City";
            muniName = muniName
              .toLowerCase()
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return {
              ...esc,
              distress_id: esc.report_id,
              isIncidentEscalation: true,
              acknowledged_at: esc.reviewed_at || esc.acknowledged_at,
              lgu_name: esc.profiles?.organization_name || esc.profiles?.full_name || "LGU Emergency Unit",
              municipality_name: muniName,
              clean_title: cleanReportTitle(esc.hazard_type || "Support Escalation"),
              formatted_id: formatReportId(esc.report_id, esc.created_at),
              priority_level: "High",
              remarks: esc.description || "Regional Support Escalation requested by LGU."
            };
          }),
          ...rawDistressRows.map((sig) => {
            const profile = sig.profiles;
            let muniName = sig.municipality_or_city?.name || "Lapu-Lapu City";
            muniName = muniName
              .toLowerCase()
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return {
              ...sig,
              isIncidentEscalation: false,
              lgu_name: profile?.organization_name || profile?.full_name || (sig.profile_id ? `LGU Unit (${sig.profile_id.substring(0, 6)})` : "LGU Emergency Unit"),
              municipality_name: muniName,
              clean_title: "Emergency Distress Signal",
              formatted_id: `DST-${new Date(sig.created_at || Date.now()).getFullYear()}-${String(sig.distress_id || "").slice(0, 4).toUpperCase()}`,
              priority_level: "High",
              remarks: sig.remarks || "Emergency distress signal transmitted by LGU unit."
            };
          })
        ];

        cachedReports = processedReports;
        cachedDistressSignals = combinedDistress;

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("floodwatch_lgu_reports", JSON.stringify(processedReports));
            sessionStorage.setItem("floodwatch_lgu_distress", JSON.stringify(combinedDistress));
          } catch (e) {}
        }

        setReports(processedReports);
        setReportsLoaded(true);
        setReportLoadVersion(version => version + 1);
        setDistressSignals(combinedDistress);

        setExpandedMunicipalities((prev) => {
          const next = { ...prev };
          processedReports.forEach((r) => {
            const key = r.municipality_id || "unknown";
            if (next[key] === undefined) next[key] = true;
          });
          return next;
        });

        setExpandedDistressMunis((prev) => {
          const next = { ...prev };
          combinedDistress.forEach((d) => {
            if (next[d.municipality_name] === undefined) next[d.municipality_name] = true;
          });
          return next;
        });

        // Only update selected items from DB if no recent action (prevents race condition reverting status)
        const timeSinceAction = Date.now() - lastActionRef.current;
        if (timeSinceAction > 5000) {
          setSelectedReport((prevSelected) => {
            if (!prevSelected) return null;
            return processedReports.find((r) => r.report_id === prevSelected.report_id) || prevSelected;
          });

          setSelectedSignal((prevSelected) => {
            if (!prevSelected) return null;
            return combinedDistress.find((s) => s.distress_id === prevSelected.distress_id) || prevSelected;
          });
        }
      } catch (err) {
        if (isMounted) setReportFetchError("Unable to refresh reports. Please try again shortly.");
        console.error("🚨 Error in fetchAllData:", err);
      } finally {
        if (isMounted) {
          setIsLoadingReports(false);
          setIsLoadingDistress(false);
        }
      }
    };

    fetchAllData();

    // Realtime Subscriptions
    const reportChannel = supabase
      .channel("lgu-auto-fetch-reports-v7")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_report" }, () => {
        fetchAllData();
      })
      .subscribe();

    const distressChannel = supabase
      .channel("lgu-auto-fetch-distress-v7")
      .on("postgres_changes", { event: "*", schema: "public", table: "distress_signals" }, () => {
        fetchAllData();
      })
      .subscribe();

    const autoFetchInterval = setInterval(() => {
      fetchAllData();
    }, 15000);

    return () => {
      isMounted = false;
      supabase.removeChannel(reportChannel);
      supabase.removeChannel(distressChannel);
      clearInterval(autoFetchInterval);
    };
  }, []);

  // Group Situational Reports by Municipality for the Hierarchy View
  const reportHierarchy = useMemo(() => buildReportHierarchy(reports), [reports]);
  const groupedReports = reportHierarchy.groups;

  // Group Distress Signals / Escalations by Municipality for Red Hierarchical Table
  const groupedDistressSignals = useMemo(() => {
    const groups = {};
    distressSignals.forEach((sig) => {
      const muni = sig.municipality_name || "Lapu-Lapu City";
      if (!groups[muni]) {
        groups[muni] = {
          municipality_name: muni,
          signals: [],
          pendingCount: 0,
          latestSignal: sig
        };
      }
      groups[muni].signals.push(sig);

      const st = (sig.status || "").toLowerCase();
      if (st.includes("pending") || st.includes("ready") || st.includes("review") || st.includes("submitted") || !st || st === "") {
        groups[muni].pendingCount += 1;
      }
    });

    return Object.values(groups);
  }, [distressSignals]);

  // Unviewed Report Count for Red Dot — shows for ANY report not yet clicked/viewed
  const hasUnviewedReports = useMemo(() => {
    return reportSeenReady && reportsLoaded && activeTab !== "Report Table" &&
      hasNewReports(reports, reportSeenAt);
  }, [reports, reportSeenAt, reportSeenReady, reportsLoaded, activeTab]);

  useEffect(() => {
    if (!reportSeenReady || !reportsLoaded || activeTab !== "Report Table" || reportSeenWriteInFlight.current) return
    const newest = newestReportTimestamp(reports)
    if (!newest || (persistedReportSeenAt.current && newest <= persistedReportSeenAt.current)) return
    setReportSeenAt(newest)
    reportSeenWriteInFlight.current = true
    supabase.auth.updateUser({ data: { provincial_reports_seen_at: newest } }).then(({ error }) => {
      if (error) throw error
      persistedReportSeenAt.current = newest
      setReportLoadVersion(version => version + 1)
    }).catch(error => console.error('Unable to save Reports table view:', error))
      .finally(() => { reportSeenWriteInFlight.current = false })
  }, [activeTab, reports, reportsLoaded, reportSeenReady, reportLoadVersion]);

  // Unviewed Distress / Escalation Count for Red Dot — shows for ANY signal not yet clicked/viewed
  const hasUnviewedDistress = useMemo(() => {
    return distressSignals.some((d) => !viewedDistressIds.includes(String(d.distress_id)));
  }, [distressSignals, viewedDistressIds]);

  // Mark distress as viewed so red dot disappears (always store as string)
  const markDistressAsViewed = (distressId) => {
    if (!distressId) return;
    const idStr = String(distressId);
    if (viewedDistressIds.includes(idStr)) return;
    const updated = [...viewedDistressIds, idStr];
    setViewedDistressIds(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("floodwatch_viewed_distress", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // Toggle dropdown for a municipality
  const toggleMunicipality = (muniName) => {
    setExpandedMunicipalities((prev) => ({
      ...prev,
      [muniName]: !prev[muniName]
    }));
  };

  const toggleDistressMunicipality = (muniName) => {
    setExpandedDistressMunis((prev) => ({
      ...prev,
      [muniName]: !prev[muniName]
    }));
  };

  // Open / Close Report Modal
  const handleOpenReportModal = (item) => {
    setSelectedReport(item);
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedReport(null);
  };

  // Open / Close Distress Modal
  const handleOpenDistressModal = (item) => {
    markDistressAsViewed(item.distress_id);
    setSelectedSignal(item);
    setIsDistressModalOpen(true);
  };

  const handleCloseDistressModal = () => {
    setIsDistressModalOpen(false);
    setSelectedSignal(null);
  };

  // Status Badge Helper (Displays "Pending", "Verified", or "Rejected")
  const getStatusBadge = (status, isRedTheme = false) => {
    const raw = status || "Pending";
    const s = raw.toLowerCase();

    if (s === "accepted" || s === "verified" || s === "approved") {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
          <BadgeCheck className="size-3.5" />
          Verified
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
          <XCircle className="size-3.5" />
          Rejected
        </span>
      );
    }
    if (s.includes("in progress") || s.includes("in_progress") || s.includes("acknowledged")) {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
          <span className="size-1.5 rounded-full bg-blue-500" />
          In Progress
        </span>
      );
    }
    if (s.includes("resolved") || s.includes("completed")) {
      return (
        <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
          <span className="size-1.5 rounded-full bg-green-500" />
          Resolved
        </span>
      );
    }

    // Default: "Pending" as requested by user
    if (isRedTheme) {
      return (
        <span className="bg-red-100 text-red-800 border border-red-300 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
          <span className="size-1.5 rounded-full bg-red-600 animate-pulse" />
          Pending
        </span>
      );
    }

    return (
      <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-2xs">
        <span className="size-1.5 rounded-full bg-amber-600 animate-pulse" />
        Pending
      </span>
    );
  };

  // ── Database Action: Accept Report -> Status becomes "Verified" in DB ──
  const handleAcceptReport = async () => {
    if (!selectedReport || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id || null;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("incident_report")
        .update({
          status: "Verified",
          reviewed_at: now,
          reviewed_by: reviewerId
        })
        .eq("report_id", selectedReport.report_id);

      if (error) {
        console.error("🚨 Error accepting report:", error.message);
        alert(`Error accepting report: ${error.message}`);
      } else {
        if (selectedReport.user_id) {
          try {
            await supabase.from("notifications").insert({
              user_id: selectedReport.user_id,
              title: "Report Verified",
              message: `Your situational report for ${selectedReport.clean_title || "incident"} has been verified and accepted by PDRRMO/Admin.`,
              type: "Updates",
              target_role: "lgu"
            });
          } catch (e) {}
        }

        lastActionRef.current = Date.now();
        const updated = { ...selectedReport, status: "Verified", reviewed_at: now };
        setSelectedReport(updated);

        setReports((prev) => {
          const next = prev.map((r) => (r.report_id === updated.report_id ? updated : r));
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

  // ── Database Action: Reject Report -> Status becomes "Rejected" in DB ──
  const handleRejectReport = async () => {
    if (!selectedReport || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id || null;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("incident_report")
        .update({
          status: "Rejected",
          reviewed_at: now,
          reviewed_by: reviewerId
        })
        .eq("report_id", selectedReport.report_id);

      if (error) {
        console.error("🚨 Error rejecting report:", error.message);
        alert(`Error rejecting report: ${error.message}`);
      } else {
        if (selectedReport.user_id) {
          try {
            await supabase.from("notifications").insert({
              user_id: selectedReport.user_id,
              title: "Report Rejected",
              message: `Your situational report for ${selectedReport.clean_title || "incident"} was reviewed and marked as rejected.`,
              type: "Updates",
              target_role: "lgu"
            });
          } catch (e) {}
        }

        lastActionRef.current = Date.now();
        const updated = { ...selectedReport, status: "Rejected", reviewed_at: now };
        setSelectedReport(updated);

        setReports((prev) => {
          const next = prev.map((r) => (r.report_id === updated.report_id ? updated : r));
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

  // ── Database Action for Distress / Escalation Signals ──
  const handleDistressStatusTransition = async (targetStatus) => {
    if (!selectedSignal || isSubmittingDistress) return;
    setIsSubmittingDistress(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id || null;
      const now = new Date().toISOString();

      if (selectedSignal.isIncidentEscalation) {
        // incident_report table check constraint only permits: 'Verified', 'Rejected', 'Ready_For_LGU', 'Pending_AI'
        const incidentDbStatus = (targetStatus === "Acknowledged" || targetStatus === "Resolved" || targetStatus === "Verified")
          ? "Verified"
          : targetStatus === "Rejected"
          ? "Rejected"
          : "Verified";

        const { error } = await supabase
          .from("incident_report")
          .update({
            status: incidentDbStatus,
            reviewed_at: now,
            reviewed_by: reviewerId
          })
          .eq("report_id", selectedSignal.report_id || selectedSignal.distress_id);

        if (error) {
          console.error("🚨 Error updating incident escalation:", error.message);
          alert(`Error updating report: ${error.message}`);
          return;
        }

        if (selectedSignal.user_id) {
          try {
            await supabase.from("notifications").insert({
              user_id: selectedSignal.user_id,
              title: incidentDbStatus === "Verified" ? "Escalation Verified" : "Escalation Rejected",
              message: `Your escalation request has been ${incidentDbStatus === "Verified" ? "acknowledged and verified" : "rejected"} by the LGU.`,
              type: "Updates",
              target_role: "lgu"
            });
          } catch (e) {}
        }
      } else {
        // Update distress_signals table
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
          console.error("🚨 Error updating distress_signals:", error.message);
          alert(`Error updating distress signal: ${error.message}`);
          return;
        }
      }

      lastActionRef.current = Date.now();
      const updatedStatus = selectedSignal.isIncidentEscalation
        ? ((targetStatus === "Acknowledged" || targetStatus === "Resolved") ? "Verified" : targetStatus)
        : targetStatus;
      const updated = { 
        ...selectedSignal, 
        status: updatedStatus, 
        acknowledged_at: now,
        reviewed_at: now 
      };
      setSelectedSignal(updated);

      setDistressSignals((prev) => {
        const next = prev.map((s) => (s.distress_id === updated.distress_id ? updated : s));
        cachedDistressSignals = next;
        if (typeof window !== "undefined") {
          try { sessionStorage.setItem("floodwatch_lgu_distress", JSON.stringify(next)); } catch (e) {}
        }
        return next;
      });
    } catch (err) {
      console.error("Unexpected error modifying distress signal:", err);
    } finally {
      setIsSubmittingDistress(false);
    }
  };

  // Paginated Groups
  const paginatedReports = useMemo(() => {
    const start = (reportPage - 1) * itemsPerPage;
    return groupedReports.slice(start, start + itemsPerPage);
  }, [groupedReports, reportPage, itemsPerPage]);

  const paginatedDistress = useMemo(() => {
    const start = (distressPage - 1) * itemsPerPage;
    return groupedDistressSignals.slice(start, start + itemsPerPage);
  }, [groupedDistressSignals, distressPage, itemsPerPage]);

  const selectedAttachments = useMemo(() => {
    return getReportAttachments(selectedReport);
  }, [selectedReport]);

  const parsedSituation = useMemo(() => {
    return parseSituationDescription(selectedReport?.description);
  }, [selectedReport]);

  const selectedCoordinates = useMemo(() => getIncidentCoordinates(selectedReport), [selectedReport]);
  const handleResolvedMapCoordinates = useCallback(coordinates => {
    setResolvedMapCoordinates({ reportId: selectedReport?.report_id, coordinates })
  }, [selectedReport?.report_id])
  const displayedCoordinates = selectedCoordinates ||
    (selectedReport?.report_id && resolvedMapCoordinates?.reportId === selectedReport.report_id
      ? resolvedMapCoordinates.coordinates : null)

  return (
    <div className="grid gap-4">
      {/* ── Header with Flex & Justify-Between Toggle ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-6 text-primary" />
          <CardSubHeader className="!mb-0 leading-none text-gray-900 font-extrabold text-xl">
            {activeTab === "Report Table" ? "LGU Incident Readiness Monitor" : "LGU Emergency Distress Signals"}
          </CardSubHeader>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* ── Toggle Buttons with Active Red Dot Tracker ── */}
          <ToogleButtonLayout className="w-full sm:w-auto">
            <ToogleButton
              active={activeTab === "Report Table"}
              className={`relative ${activeTab === "Report Table" ? "button-toogle-active font-bold" : ""}`}
              onClick={() => setActiveTab("Report Table")}
            >
              <span className="flex items-center gap-1.5">
                Report Table
                {hasUnviewedReports && (
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                  </span>
                )}
              </span>
            </ToogleButton>

            <ToogleButton
              active={activeTab === "Distress Signals"}
              className={`relative ${activeTab === "Distress Signals" ? "button-toogle-active font-bold !bg-red-500 !text-white" : ""}`}
              onClick={() => {
                setActiveTab("Distress Signals");
              }}
            >
              <span className="flex items-center gap-1.5">
                Distress Signals
                {hasUnviewedDistress && (
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                  </span>
                )}
              </span>
            </ToogleButton>
          </ToogleButtonLayout>
        </div>
      </div>

      {/* ── Table Container ── */}
      <Table>
        <TableScrollWrapper>
          <DataTable>
            {activeTab === "Report Table" ? (
              // ── 1. REPORT HIERARCHY TABLE (Situational Reports) ──
              <>
                <TableHead>
                  <tr>
                    <Th className="min-w-[280px]">ACCOUNT / INCIDENT REPORT HIERARCHY</Th>
                    <Th className="min-w-[120px]">REPORT ID</Th>
                    <Th className="min-w-[130px]">INCIDENT TYPE</Th>
                    <Th className="min-w-[160px]">LOCATION</Th>
                    <Th className="min-w-[120px]">CREATED AT</Th>
                    <Th className="min-w-[90px]">PRIORITY</Th>
                    <Th className="min-w-[130px]">STATUS</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {reportFetchError && (
                    <TableRow><TableDataMuted colSpan={7} role="alert">{reportFetchError}</TableDataMuted></TableRow>
                  )}
                  {reportHierarchy.unresolved.length > 0 && (
                    <TableRow><TableDataMuted colSpan={7} role="alert">
                      {reportHierarchy.unresolved.length} linked update(s) could not be loaded with their main report.
                    </TableDataMuted></TableRow>
                  )}
                  {isLoadingReports ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`skeleton-report-${i}`}>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                      </TableRow>
                    ))
                  ) : groupedReports.length > 0 ? (
                    paginatedReports.map((group) => {
                      const isExpanded = expandedMunicipalities[group.municipality_id] ?? true;
                      const latest = group.latestReport;

                      return (
                        <React.Fragment key={`group-${group.municipality_id}`}>
                          {/* Municipality Header Row */}
                          <TableRow
                            onClick={() => toggleMunicipality(group.municipality_id)}
                            className="bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer transition-colors border-b border-gray-200"
                          >
                            <TableData className="font-extrabold text-gray-900 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="p-1 text-gray-600 hover:text-gray-900 transition-transform">
                                  {isExpanded ? (
                                    <ChevronDown className="size-4.5 text-gray-800 shrink-0" />
                                  ) : (
                                    <ChevronRight className="size-4.5 text-gray-800 shrink-0" />
                                  )}
                                </span>
                                <span className="text-sm font-black tracking-tight">{group.municipality_name}</span>
                                <span className="bg-gray-200/80 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
                                  {group.reports.length} {group.reports.length === 1 ? "Report" : "Reports"}
                                </span>
                                {group.pendingCount > 0 && (
                                  <span className="relative flex size-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
                                  </span>
                                )}
                              </div>
                            </TableData>

                            <TableDataMuted className="text-xs font-mono font-bold">
                              {latest?.formatted_id || "—"}
                            </TableDataMuted>

                            <TableData>
                              {renderIncidentTypeBadge(latest?.hazard_type, latest?.report_type)}
                            </TableData>

                            <TableDataMuted className="text-xs truncate max-w-[160px]">
                              {latest?.location_name || group.municipality_name}
                            </TableDataMuted>

                            <TableDataMuted className="text-xs whitespace-nowrap">
                              {formatRelativeTime(latest?.created_at)}
                            </TableDataMuted>

                            <TableData className="text-xs">
                              {renderPriority(latest?.priority_level || "Medium")}
                            </TableData>

                            <TableData>
                              {getStatusBadge(latest?.status)}
                            </TableData>
                          </TableRow>

                          {/* Individual Situational Report Rows */}
                          {isExpanded &&
                            group.reports.map((item, repIndex) => {
                              const reportTitle = item.clean_title || "Situational Report";
                              const reportExpanded = expandedReports[item.report_id] ?? true;

                              return (
                                <React.Fragment key={item.report_id}>
                                <TableRow
                                  key={item.report_id || `rep-${group.municipality_name}-${repIndex}`}
                                  onClick={() => setExpandedReports(prev => ({ ...prev, [item.report_id]: !reportExpanded }))}
                                  className="hover:bg-blue-50/50 cursor-pointer transition-colors border-b border-gray-100 bg-white"
                                >
                                  <TableData className="pl-9 py-3">
                                    <div className="flex items-center gap-2 group">
                                      <button
                                        type="button"
                                        aria-label={`${reportExpanded ? "Collapse" : "Expand"} ${reportTitle} updates`}
                                        aria-expanded={reportExpanded}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setExpandedReports(prev => ({ ...prev, [item.report_id]: !reportExpanded }));
                                        }}
                                        className="p-1 text-gray-400 hover:text-primary shrink-0"
                                      >
                                        {reportExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                      </button>
                                      <span className="font-bold text-gray-800 group-hover:text-primary transition-colors text-sm">
                                        {reportTitle}
                                      </span>
                                      <span className="text-xs text-gray-500 whitespace-nowrap">{item.updates.length} {item.updates.length === 1 ? "update" : "updates"}</span>
                                      <button
                                        type="button"
                                        aria-label={`View ${reportTitle} details`}
                                        title="View report details"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleOpenReportModal(item);
                                        }}
                                        className="p-1 text-gray-400 hover:text-primary shrink-0"
                                      >
                                        <Eye className="size-4" />
                                      </button>
                                    </div>
                                  </TableData>

                                  <TableDataMuted className="text-xs font-mono font-medium">
                                    {item.formatted_id}
                                  </TableDataMuted>

                                  <TableData>
                                    {renderIncidentTypeBadge(item.hazard_type, item.report_type)}
                                  </TableData>

                                  <TableDataMuted className="text-xs truncate max-w-[180px]">
                                    {item.location_name}
                                  </TableDataMuted>

                                  <TableDataMuted className="text-xs whitespace-nowrap">
                                    {formatRelativeTime(item.created_at)}
                                  </TableDataMuted>

                                  <TableData className="text-xs">
                                    {renderPriority(item.priority_level)}
                                  </TableData>

                                  <TableData>
                                    {getStatusBadge(item.status)}
                                    {item.updates.length > 0 && (
                                      <div className="text-[11px] text-gray-500 mt-1">Latest: {item.latestReport.status || "Pending"}</div>
                                    )}
                                  </TableData>
                                </TableRow>
                                {reportExpanded && item.updates.map((update, updateIndex) => (
                                  <TableRow key={update.report_id} onClick={() => handleOpenReportModal(update)}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors border-b border-gray-100 bg-white">
                                    <TableData className="pl-16 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-400" aria-hidden="true">{updateIndex === item.updates.length - 1 ? "└──" : "├──"}</span>
                                        <span className="font-bold text-gray-800 text-sm">Update {updateIndex + 1}</span>
                                        <span className="text-xs text-gray-500">{update.clean_title}</span>
                                      </div>
                                    </TableData>
                                    <TableDataMuted className="text-xs font-mono font-medium">{update.formatted_id}</TableDataMuted>
                                    <TableData>{renderIncidentTypeBadge(update.hazard_type, update.report_type)}</TableData>
                                    <TableDataMuted className="text-xs truncate max-w-[180px]">{update.location_name}</TableDataMuted>
                                    <TableDataMuted className="text-xs whitespace-nowrap">{formatRelativeTime(update.created_at)}</TableDataMuted>
                                    <TableData className="text-xs">{renderPriority(update.priority_level)}</TableData>
                                    <TableData>{getStatusBadge(update.status)}</TableData>
                                  </TableRow>
                                ))}
                                {reportExpanded && item.updates.length === 0 && (
                                  <TableRow><TableDataMuted colSpan={7} className="pl-16 py-3">No linked updates yet.</TableDataMuted></TableRow>
                                )}
                                </React.Fragment>
                              );
                            })}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableDataMuted colSpan={7} className="text-center py-12">
                        No situational reports recorded at this time.
                      </TableDataMuted>
                    </TableRow>
                  )}
                </tbody>
              </>
            ) : (
              // ── 2. DISTRESS SIGNALS TABLE (Same Hierarchy Design in Red Theme) ──
              <>
                <TableHead>
                  <tr>
                    <Th className="min-w-[280px]">ACCOUNT / INCIDENT REPORT HIERARCHY</Th>
                    <Th className="min-w-[120px]">REPORT ID</Th>
                    <Th className="min-w-[130px]">INCIDENT TYPE</Th>
                    <Th className="min-w-[160px]">LOCATION</Th>
                    <Th className="min-w-[120px]">CREATED AT</Th>
                    <Th className="min-w-[90px]">PRIORITY</Th>
                    <Th className="min-w-[130px]">STATUS</Th>
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
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                        <TableData><SingleLineSkeleton /></TableData>
                      </TableRow>
                    ))
                  ) : groupedDistressSignals.length > 0 ? (
                    paginatedDistress.map((group) => {
                      const isExpanded = expandedDistressMunis[group.municipality_name] ?? true;
                      const latest = group.latestSignal;

                      return (
                        <React.Fragment key={`distress-group-${group.municipality_name}`}>
                          {/* Distress Municipality Group Header in Red */}
                          <TableRow
                            onClick={() => toggleDistressMunicipality(group.municipality_name)}
                            className="bg-red-50/80 hover:bg-red-100/80 cursor-pointer transition-colors border-b border-red-200"
                          >
                            <TableData className="font-extrabold text-red-950 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="p-1 text-red-700 transition-transform">
                                  {isExpanded ? (
                                    <ChevronDown className="size-4.5 text-red-700 shrink-0" />
                                  ) : (
                                    <ChevronRight className="size-4.5 text-red-700 shrink-0" />
                                  )}
                                </span>
                                <span className="text-sm font-black tracking-tight text-red-900">{group.municipality_name}</span>
                                <span className="bg-red-200 text-red-800 text-[11px] font-black px-2 py-0.5 rounded-full ml-1">
                                  {group.signals.length} {group.signals.length === 1 ? "Escalation" : "Escalations"}
                                </span>
                                {group.pendingCount > 0 && (
                                  <span className="relative flex size-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full size-2 bg-red-600" />
                                  </span>
                                )}
                              </div>
                            </TableData>

                            <TableDataMuted className="text-xs font-mono font-bold text-red-700">
                              {latest?.formatted_id || "—"}
                            </TableDataMuted>

                            <TableData>
                              {renderIncidentTypeBadge(latest?.clean_title || latest?.hazard_type, latest?.report_type, true)}
                            </TableData>

                            <TableDataMuted className="text-xs truncate max-w-[160px] text-red-900 font-medium">
                              {latest?.location_name || group.municipality_name}
                            </TableDataMuted>

                            <TableDataMuted className="text-xs whitespace-nowrap">
                              {formatRelativeTime(latest?.created_at)}
                            </TableDataMuted>

                            <TableData className="text-xs">
                              {renderPriority(latest?.priority_level || "High")}
                            </TableData>

                            <TableData>
                              {getStatusBadge(latest?.status, true)}
                            </TableData>
                          </TableRow>

                          {/* Individual Escalation / Distress Rows */}
                          {isExpanded &&
                            group.signals.map((item, sigIndex) => {
                              const reportTitle = item.clean_title || "Support Escalation";

                              return (
                                <TableRow
                                  key={item.distress_id || `dst-${group.municipality_name}-${sigIndex}`}
                                  onClick={() => handleOpenDistressModal(item)}
                                  className="hover:bg-red-50/70 cursor-pointer transition-colors border-b border-red-100 bg-red-50/30 border-l-4 border-l-red-500"
                                >
                                  <TableData className="pl-9 py-3">
                                    <div className="flex items-center gap-2 group">
                                      <ChevronRight className="size-4 text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
                                      <span className="font-bold text-red-950 group-hover:text-red-700 transition-colors text-sm">
                                        {reportTitle}
                                      </span>
                                    </div>
                                  </TableData>

                                  <TableDataMuted className="text-xs font-mono font-bold text-red-700">
                                    {item.formatted_id}
                                  </TableDataMuted>

                                  <TableData>
                                    {renderIncidentTypeBadge(item.clean_title || item.hazard_type, item.report_type, true)}
                                  </TableData>

                                  <TableDataMuted className="text-xs truncate max-w-[180px] text-gray-700">
                                    {item.location_name || item.municipality_name}
                                  </TableDataMuted>

                                  <TableDataMuted className="text-xs whitespace-nowrap">
                                    {formatRelativeTime(item.created_at)}
                                  </TableDataMuted>

                                  <TableData className="text-xs">
                                    {renderPriority(item.priority_level || "High")}
                                  </TableData>

                                  <TableData>
                                    {getStatusBadge(item.status, true)}
                                  </TableData>
                                </TableRow>
                              );
                            })}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableDataMuted colSpan={7} className="text-center py-12">
                        No emergency escalations or distress signals recorded.
                      </TableDataMuted>
                    </TableRow>
                  )}
                </tbody>
              </>
            )}
          </DataTable>
        </TableScrollWrapper>

        {/* ── Table Pagination ── */}
        {activeTab === "Report Table" ? (
          <TablePagination
            currentPage={reportPage}
            totalItems={groupedReports.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setReportPage}
          />
        ) : (
          <TablePagination
            currentPage={distressPage}
            totalItems={groupedDistressSignals.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setDistressPage}
          />
        )}
      </Table>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SIDE DRAWER MODAL FOR INCIDENT REPORT ──                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isReportModalOpen && selectedReport && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity" onClick={handleCloseReportModal} />

          <SideModal className="z-50 !w-full sm:!w-[480px] md:!w-[520px] bg-white shadow-2xl flex flex-col h-full">
            <div className="flex flex-col h-full bg-white overflow-y-auto">

              {/* ── Header Area ── */}
              <div className="p-6 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
                      Incident Report Details
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-500">
                      {selectedReport.formatted_id}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseReportModal}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>

                {/* Clean Title */}
                <h1 className="text-2xl font-black text-gray-900 leading-tight mt-1 capitalize">
                  {selectedReport.clean_title || "Situational Report"}
                </h1>

                {/* Status Badges Row */}
                <div className="flex items-center gap-2 mt-3">
                  {getStatusBadge(selectedReport.status)}

                  <span className="bg-orange-100 text-orange-800 font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                    {selectedReport.priority_level || "Medium"} Priority
                  </span>
                </div>
              </div>

              {/* ── Scrollable Body Content ── */}
              <div className="p-6 space-y-6 flex-1">

                {/* 1. Officer / Reporter Profile Card */}
                <div className="p-4 bg-white border border-gray-200/90 rounded-2xl flex items-center justify-between shadow-2xs gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {selectedReport.profiles?.profile_picture ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedReport.profiles.profile_picture}
                        alt="Reporter"
                        className="size-12 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {getInitials(selectedReport.profiles?.full_name || selectedReport.profiles?.organization_name || "Kathlene")}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">
                        {selectedReport.profiles?.full_name
                          ? `Officer ${selectedReport.profiles.full_name}`
                          : "Officer Kathlene"}
                      </div>
                      <div className="text-xs text-gray-500 font-medium truncate">
                        {selectedReport.profiles?.organization_name || `${selectedReport.municipality_name} DRRM Lead`}
                      </div>
                      <div className="text-xs text-blue-600 font-bold mt-0.5 flex items-center gap-1">
                        <Phone className="size-3" />
                        {selectedReport.profiles?.mobile_number || "+63 917 554 8921"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      SUBMITTED VIA
                    </div>
                    <div className="text-xs font-black text-gray-900 mt-0.5">
                      FloodWatch App
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {selectedReport.created_at
                        ? new Date(selectedReport.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Today, 10:24 AM"}
                    </div>
                  </div>
                </div>

                {/* 2. Incident Situation Report (Clean Separation of Field Status & Notes) */}
                <div>
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Incident Situation Report
                  </h3>
                  <div className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3">
                    {/* Clean Field Status Pill */}
                    {parsedSituation.fieldStatus && (
                      <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Field Status:
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black">
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {parsedSituation.fieldStatus}
                        </span>
                      </div>
                    )}

                    {/* Situation Notes */}
                    <div className="text-sm text-gray-800 leading-relaxed font-medium bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                      {parsedSituation.note}
                    </div>

                    {parsedSituation.linkedReportId && (
                      <div className="text-xs text-gray-600">
                        <span className="font-bold">Linked situational report</span>
                        <span className="block mt-1 font-mono break-all">ID: {parsedSituation.linkedReportId}</span>
                      </div>
                    )}

                    {/* Attached Document Button inside Report Box */}
                    {parsedSituation.attachedDoc && (
                      <div className="pt-2">
                        <a
                          href={`https://xncciaozzxoqbesfxpww.supabase.co/storage/v1/object/public/incident-reports/${encodeURIComponent(parsedSituation.attachedDoc)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-between w-full p-3 bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-4 text-red-500 shrink-0" />
                            <span className="truncate">{parsedSituation.attachedDoc}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-white text-blue-600 rounded-lg border border-blue-200 text-[11px] font-extrabold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            Click to View / Download
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Location Coordinates & Visual Preview Map */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                      Location Coordinates
                    </h3>
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {displayedCoordinates
                        ? `${Math.abs(displayedCoordinates.latitude).toFixed(10)}° ${displayedCoordinates.latitude < 0 ? "S" : "N"}, ${Math.abs(displayedCoordinates.longitude).toFixed(10)}° ${displayedCoordinates.longitude < 0 ? "W" : "E"}`
                        : "Unavailable"}
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-slate-100 h-36 flex items-center justify-center">
                    <IncidentLocationMap
                      key={selectedReport.report_id}
                      coordinates={selectedCoordinates}
                      municipality={selectedReport.municipality_or_city?.name || selectedReport.municipality_name}
                      municipalityId={selectedReport.municipality_id}
                      onLocationChange={handleResolvedMapCoordinates}
                    />
                    {selectedCoordinates && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedCoordinates.latitude},${selectedCoordinates.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 z-20 text-[11px] font-bold text-blue-600 bg-white/90 hover:bg-white px-2 py-1 rounded-lg border border-blue-200 flex items-center gap-1 shadow-xs"
                      >
                        <ExternalLink className="size-3" /> Full Map
                      </a>
                    )}
                  </div>
                </div>
                {/* 4. Citizen / App Field Photos & Clickable Documents */}
                <div>
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Citizen / App Field Files & Photos ({selectedAttachments.length})</span>
                    {selectedAttachments.length > 0 && (
                      <span className="text-[10px] text-blue-600 font-bold">Click file to view / download</span>
                    )}
                  </h3>

                  {selectedAttachments.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedAttachments.map((att, attIdx) => {
                        if (att.isPdf) {
                          return (
                            <a
                              key={`att-${attIdx}`}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-2xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 p-3.5 flex items-center justify-between gap-3 transition-colors shadow-2xs group cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                                  <FileText className="size-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-800 truncate group-hover:text-blue-700">
                                    {att.name}
                                  </div>
                                  <div className="text-[10px] text-gray-500">PDF Document Attachment</div>
                                </div>
                              </div>
                              <span className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs">
                                <Eye className="size-3.5" /> Open / View
                              </span>
                            </a>
                          );
                        }

                        return (
                          <div
                            key={`att-${attIdx}`}
                            onClick={() => setPreviewImage(att.url)}
                            className="relative rounded-2xl overflow-hidden border border-gray-200 bg-slate-900 group cursor-pointer aspect-video shadow-xs max-w-sm"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={att.url}
                              alt="Attachment"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                              <div className="text-[11px] font-bold text-white truncate drop-shadow-xs">
                                {att.name}
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                              <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Eye className="size-3.5" /> View Photo
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-400 font-medium">
                      No photographic or document attachments submitted.
                    </div>
                  )}
                </div>

              </div>

              {/* ── Footer Actions (Accept or Reject Buttons) ── */}
              <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50 shrink-0 space-y-2.5">
                {(() => {
                  const st = (selectedReport.status || "").toLowerCase();
                  const isVerified = st === "accepted" || st === "verified" || st.includes("approved");
                  const isRejected = st === "rejected";
                  const isResolved = st === "resolved" || st === "completed";

                  if (isVerified) {
                    return (
                      <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-center font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
                        <BadgeCheck className="size-5" />
                        This report has been verified and accepted.
                      </div>
                    );
                  }

                  if (isRejected) {
                    return (
                      <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 text-center font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
                        <XCircle className="size-5" />
                        This report has been rejected.
                      </div>
                    );
                  }

                  if (isResolved) {
                    return (
                      <div className="p-3.5 bg-green-50 text-green-800 border border-green-200 text-center font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-5" />
                        This report has been resolved.
                      </div>
                    );
                  }

                  // Default: Pending — show Accept / Reject buttons
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <button
                          id="btn-accept-report"
                          onClick={handleAcceptReport}
                          disabled={isSubmittingReport}
                          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmittingReport ? (
                            <Loader2 className="size-4.5 animate-spin" />
                          ) : (
                            <Check className="size-4.5 stroke-[3]" />
                          )}
                          <span>Accept Report</span>
                        </button>

                        <button
                          id="btn-reject-report"
                          onClick={handleRejectReport}
                          disabled={isSubmittingReport}
                          className="flex-1 py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmittingReport ? (
                            <Loader2 className="size-4.5 animate-spin" />
                          ) : (
                            <XCircle className="size-4.5" />
                          )}
                          <span>Reject Report</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium text-center">
                        Reviewing updates database status in real-time and notifies the LGU reporter.
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </SideModal>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SIDE DRAWER MODAL FOR EMERGENCY DISTRESS / ESCALATION ──     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isDistressModalOpen && selectedSignal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity" onClick={handleCloseDistressModal} />

          <SideModal className="z-50 !w-full sm:!w-[460px] md:!w-[500px] bg-white shadow-2xl flex flex-col h-full">
            <div className="flex flex-col h-full bg-white overflow-y-auto">

              {/* Emergency Red Accent Header */}
              <div className="p-6 pb-4 bg-red-50/80 border-b border-red-200 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-white animate-ping" />
                      EMERGENCY DISTRESS
                    </span>
                    <span className="text-xs font-mono font-bold text-red-700">
                      {selectedSignal.formatted_id}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseDistressModal}
                    className="p-1.5 rounded-xl bg-white hover:bg-gray-100 text-gray-600 transition-colors border border-red-200"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>

                <h1 className="text-2xl font-black text-red-950 leading-tight mt-2">
                  {selectedSignal.clean_title || "Emergency Support Escalation"}
                </h1>

                <div className="flex items-center gap-2 mt-3">
                  {getStatusBadge(selectedSignal.status, true)}
                  <span className="text-xs text-red-700 font-bold flex items-center gap-1">
                    <MapPin className="size-3.5" /> {selectedSignal.municipality_name}
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-5 flex-1">
                {/* LGU Sender Info */}
                <div className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-red-600 text-white font-black text-sm flex items-center justify-center">
                      <Radio className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-gray-900">{selectedSignal.lgu_name}</div>
                      <div className="text-xs text-gray-500">{selectedSignal.municipality_name} Emergency Team</div>
                    </div>
                  </div>
                </div>

                {/* Emergency Remarks */}
                <div>
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Emergency Remarks & Signal Log
                  </h3>
                  <div className="p-4 bg-red-50/50 text-red-950 border border-red-200/80 rounded-2xl text-sm leading-relaxed font-medium">
                    {selectedSignal.remarks || "Critical escalation submitted by LGU unit requesting immediate provincial support."}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> Transmitted At:
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedSignal.created_at ? new Date(selectedSignal.created_at).toLocaleString() : "—"}
                    </span>
                  </div>
                  {selectedSignal.acknowledged_at && (
                    <div className="flex items-center justify-between text-green-700 pt-2 border-t border-gray-200">
                      <span className="font-semibold flex items-center gap-1.5">
                        <BadgeCheck className="size-3.5" /> Acknowledged At:
                      </span>
                      <span className="font-bold">
                        {new Date(selectedSignal.acknowledged_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Action Buttons — Accept / Reject for Distress Signals */}
              <div className="p-6 pt-4 border-t border-red-100 bg-red-50/30 shrink-0 space-y-2.5">
                {(() => {
                  const st = (selectedSignal.status || "pending").toLowerCase();
                  const isPending = st === "pending" || st === "" || st === "submitted";
                  const isAccepted = st === "accepted" || st === "verified" || st === "acknowledged" || st.includes("approved");
                  const isRejected = st === "rejected";
                  const isResolved = st === "resolved" || st === "completed";

                  if (isResolved) {
                    return (
                      <div className="p-3 bg-green-50 text-green-800 border border-green-200 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-4" />
                        This emergency signal has been marked as resolved.
                      </div>
                    );
                  }

                  if (isAccepted) {
                    return (
                      <>
                        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                          <BadgeCheck className="size-4" />
                          This distress signal has been accepted and acknowledged.
                        </div>
                        <button
                          onClick={() => handleDistressStatusTransition("Resolved")}
                          disabled={isSubmittingDistress}
                          className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isSubmittingDistress ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          Mark as Resolved
                        </button>
                      </>
                    );
                  }

                  if (isRejected) {
                    return (
                      <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                        <XCircle className="size-4" />
                        This distress signal has been rejected.
                      </div>
                    );
                  }

                  // Default: Pending — show Accept / Reject
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        {/* Accept Button */}
                        <button
                          id="btn-accept-distress"
                          onClick={() => handleDistressStatusTransition("Acknowledged")}
                          disabled={isSubmittingDistress}
                          className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmittingDistress ? (
                            <Loader2 className="size-4.5 animate-spin" />
                          ) : (
                            <Check className="size-4.5 stroke-[3]" />
                          )}
                          <span>Accept Signal</span>
                        </button>

                        {/* Reject Button */}
                        <button
                          id="btn-reject-distress"
                          onClick={() => handleDistressStatusTransition("Rejected")}
                          disabled={isSubmittingDistress}
                          className="flex-1 py-3.5 px-4 bg-white hover:bg-red-50 text-red-700 border-2 border-red-300 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmittingDistress ? (
                            <Loader2 className="size-4.5 animate-spin" />
                          ) : (
                            <XCircle className="size-4.5" />
                          )}
                          <span>Reject Signal</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-red-400 font-medium text-center">
                        Accepting acknowledges the emergency. Rejecting will dismiss this distress signal.
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </SideModal>
        </>
      )}

      {/* ── Image Fullscreen Lightbox ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-10"
            >
              <X className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Fullscreen Attachment" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
