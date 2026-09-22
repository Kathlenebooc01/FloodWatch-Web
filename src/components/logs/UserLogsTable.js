"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import DataTable from "../table/DataTable"
import Table from "../table/Table"
import TableBadge from "../table/TableBadge"
import TableData from "../table/TableData"
import TableDataAction from "../table/TableDataAction"
import TableDataMuted from "../table/TableDataMuted"
import TableHead from "../table/TableHead"
import TableHeader from "../table/TableHeader"
import TableRow from "../table/TableRow"
import TableScrollWrapper from "../table/TableScrollWrapper"
import Th from "../table/Th"
import { ShieldAlert, ShieldCheck, ChevronRight, Search } from "lucide-react"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { supabase } from "@/supabase/util/supabase"

const TABS = ["All", "Success", "Blocked"]

// ── Lazy Row with IntersectionObserver ──
function LazyRow({ row, scrollRoot, onSelectLog }) {
  const [state, setState] = useState("hidden")
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("loading")
          observer.disconnect()
        }
      },
      { root: scrollRoot, rootMargin: "100px" }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [scrollRoot])

  useEffect(() => {
    if (state !== "loading") return
    const timer = setTimeout(() => setState("loaded"), 300)
    return () => clearTimeout(timer)
  }, [state])

  const email = row.profiles?.email || "Unknown";
  const loginTime = row.login_time ? new Date(row.login_time).toLocaleString() : "Unknown";

  return (
    <TableRow ref={ref} style={state === "hidden" ? { visibility: "hidden", height: "64px" } : undefined}>
      {state === "hidden" ? (
        <>
          <TableData><div style={{ display: "none" }} /></TableData>
          <TableData><div style={{ display: "none" }} /></TableData>
          <TableData><div style={{ display: "none" }} /></TableData>
          <TableData><div style={{ display: "none" }} /></TableData>
          <TableDataAction><div style={{ display: "none" }} /></TableDataAction>
        </>
      ) : state === "loading" ? (
        <>
          <TableData><SingleLineSkeleton /></TableData>
          <TableData><SingleLineSkeleton /></TableData>
          <TableData><SingleLineSkeleton /></TableData>
          <TableData><SingleLineSkeleton /></TableData>
          <TableDataAction><div style={{ width: "32px", height: "32px" }} /></TableDataAction>
        </>
      ) : (
        <>
          <TableData className="font-medium text-gray-800">
            {email}
          </TableData>
          <TableData>
            <div className="flex flex-col">
              <span className="font-mono text-sm">{row.ip_address}</span>
              <span className="text-xs text-gray-500">{row.login_location}</span>
            </div>
          </TableData>
          <TableDataMuted>{loginTime}</TableDataMuted>
          <TableData>
            {row.status === "success" ? (
              <TableBadge className=" text-emerald-700">
                Success
              </TableBadge>
            ) : (
              <div className="flex flex-col gap-1">
                <TableBadge className="text-red-700">
                  Blocked
                </TableBadge>
                {row.is_vpn && (
                  <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">
                    {row.block_reason}
                  </span>
                )}
              </div>
            )}
          </TableData>
          <TableDataAction>
            <button
              className="table-action-btn"
              aria-label={`View log details for ${email}`}
              onClick={() => onSelectLog(row)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TableDataAction>
        </>
      )}
    </TableRow>
  )
}

export default function UserLogsTable({ onSelectLog }) {
  const [activeTab, setActiveTab] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("login_logs")
        .select(`*, profiles(full_name, email, role)`)
        .order("login_time", { ascending: false })

      if (data) {
        setLogs(data)
      } else if (error) {
        console.error("Error fetching login logs:", error)
      }
      setIsLoading(false)
    }

    fetchLogs()
  }, [])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  const filtered = useMemo(() => {
    let rows = logs
    if (activeTab === "Success") rows = rows.filter((r) => r.status === "success")
    if (activeTab === "Blocked") rows = rows.filter((r) => r.status === "blocked")
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(r => 
        (r.profiles?.email || "").toLowerCase().includes(q) ||
        (r.ip_address || "").toLowerCase().includes(q) ||
        (r.login_location || "").toLowerCase().includes(q)
      )
    }
    return rows
  }, [activeTab, logs, searchQuery])

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage])

  return (
    <div className="grid w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search email, IP, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
          />
        </div>
      </div>

      <Table className="w-full min-w-0">
        <TableHeader>
          <h2 className="table-title">System Authentication Logs</h2>
        </TableHeader>

        <TableScrollWrapper ref={scrollRef} className="w-full overflow-x-auto">
          <DataTable className="w-full whitespace-nowrap">
            <TableHead>
            <tr>
              <Th>User</Th>
              <Th>IP Address & Location</Th>
              <Th>Login Time</Th>
              <Th>Status</Th>
              <Th className="table-th-right">Action</Th>
            </tr>
          </TableHead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableDataAction><div style={{ width: "32px", height: "32px" }} /></TableDataAction>
                </TableRow>
              ))
            ) : paginatedRows.length > 0 ? (
              paginatedRows.map((log) => (
                <LazyRow key={log.id} row={log} scrollRoot={scrollRef.current} onSelectLog={onSelectLog} />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 text-sm py-10">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>
      
      {/* Pagination Controls */}
      {filtered.length > itemsPerPage && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 bg-gray-50/50 sm:px-6 rounded-b-xl gap-4">
          <div className="hidden sm:block shrink-0">
            <p className="text-sm text-gray-600 whitespace-nowrap">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> results
            </p>
          </div>
          <div className="flex-1 flex justify-between sm:justify-end gap-2 w-full">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="sm:hidden flex items-center text-sm text-gray-600 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Table>
    </div>
  )
}
