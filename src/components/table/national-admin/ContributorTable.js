"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { SlidersHorizontal, Search, ChevronRight } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"
import Table from "../Table"
import TableHeader from "../TableHeader"
import TableScrollWrapper from "../TableScrollWrapper"
import DataTable from "../DataTable"
import TableHead from "../TableHead"
import Th from "../Th"
import TableRow from "../TableRow"
import TableData from "../TableData"
import TableDataMuted from "../TableDataMuted"
import TableDataAction from "../TableDataAction"
import TableBadge from "../TableBadge"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import PrimaryButton from "@/components/button/PrimaryButton"
import InviteUserModal from "@/components/contributors/InviteUserModal"
import UserModal from "@/app/national-admin/contributor/UserModal"
import { UserPlus } from "lucide-react"

const TABS = ["All", "Pending", "Accepted"]


// ── Lazy Row with IntersectionObserver ──
function LazyRow({ row, scrollRoot, onViewDetails }) {
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

  // Build initials from email (e.g. j.cruz@... → JC)
  const initials = row.email
    .split("@")[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")

  const isAccepted = row.status === "accepted"

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
          {/* Contributor */}
          <TableData>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-xs font-bold text-gray-500 shrink-0">
                {initials}
              </span>
              <span className="font-medium text-gray-800">{row.email}</span>
            </div>
          </TableData>

          {/* Province */}
          <TableData>{row.province}</TableData>

          {/* Status */}
          <TableData>
            <TableBadge className={row.status === "accepted"
              ? "bg-green-50 text-green-600"
              : row.status === "expired"
                ? "bg-red-50 text-red-500"
                : "bg-orange-50 text-orange-500"
            }>
              {row.status === "accepted" ? "ACCEPTED" : row.status === "expired" ? "EXPIRED" : "PENDING"}
            </TableBadge>
          </TableData>

          {/* Role */}
          <TableDataMuted>{row.role}</TableDataMuted>

          {/* Action */}
          <TableDataAction>
            <button className="table-action-btn" onClick={() => onViewDetails(row.id)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </TableDataAction>
        </>
      )}
    </TableRow>
  )
}

// ── Main Table ──
export default function ContributorTable({ title = "Contributors" }) {
  const [data, setData] = useState([])
  const [activeTab, setActiveTab] = useState("All")
  const [search, setSearch] = useState("")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedInviteId, setSelectedInviteId] = useState(null)
  const scrollRef = useRef(null)

  // Fetch invitations from Supabase
  useEffect(() => {
    const fetchInvitations = async () => {
      const { data: invitations } = await supabase
        .from('invitations')
        .select('id, lgu_name, official_email, account_role, status, created_at')
        .order('created_at', { ascending: false })

      if (invitations) {
        setData(invitations.map((inv) => ({
          id: inv.id,
          email: inv.official_email,
          province: inv.lgu_name,
          status: inv.status?.toLowerCase(),
          role: inv.account_role,
        })))
      }
    }
    fetchInvitations()
  }, [])

  // Filter by tab + search
  const filtered = useMemo(() => {
    let rows = data
    if (activeTab === "Pending") rows = rows.filter((r) => r.status === "pending")
    if (activeTab === "Accepted") rows = rows.filter((r) => r.status === "accepted")
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) => r.email.toLowerCase().includes(q) || r.province.toLowerCase().includes(q)
      )
    }
    return rows
  }, [data, activeTab, search])

  return (
    <>
    <Table>
      {/* Top bar: Tabs + Search + Filter */}
      <TableHeader>
        <div className="button-toogle-layout">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`button-toogle ${activeTab === tab ? "button-toogle-active" : "text-gray-500"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-stretch gap-2">
          <PrimaryButton className=" flex gap-2 items-center" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="size-5" />
            <span className="hidden sm:inline">Invite Contributor</span>
          </PrimaryButton>
        </div>
      </TableHeader>

      {/* Table */}
      <TableScrollWrapper ref={scrollRef}>
        <DataTable>
          <TableHead>
            <tr>
              <Th>Contributor</Th>
              <Th>Province</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th className="table-th-right">Action</Th>
            </tr>
          </TableHead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row) => (
                <LazyRow key={row.id} row={row} scrollRoot={scrollRef.current} onViewDetails={setSelectedInviteId} />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 text-sm py-10">
                  No contributors found.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>
    </Table>
    {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} />}
    {selectedInviteId && <UserModal invitationId={selectedInviteId} onClose={() => setSelectedInviteId(null)} />}
    </>
  )
}
