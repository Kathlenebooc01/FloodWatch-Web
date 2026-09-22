"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Table from "@/components/table/Table"
import TableHeader from "@/components/table/TableHeader"
import TableScrollWrapper from "@/components/table/TableScrollWrapper"
import DataTable from "@/components/table/DataTable"
import TableHead from "@/components/table/TableHead"
import Th from "@/components/table/Th"
import TableRow from "@/components/table/TableRow"
import TableData from "@/components/table/TableData"
import TableDataMuted from "@/components/table/TableDataMuted"
import TableDataAction from "@/components/table/TableDataAction"
import TableBadge from "@/components/table/TableBadge"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import SearchInput from "@/components/forms/SearchInput"
import SideModal from "@/components/Modal/SideModal"
import CardHeader from "@/components/cards/CardHeader"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { 
  ChevronRight, 
  ChevronDown,
  SlidersHorizontal,
  Check,
  User, 
  UserX,
  UserCheck,
  Loader2,
  X, 
  MapPin, 
  Building, 
  Phone, 
  Shield, 
  UserRoundCog, 
  CalendarDays, 
  Mail,
  CheckCircle2,
  XCircle,
  Trash2
} from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

const ROLE_TABS = [
  { label: "All Users", key: "all" },
  { label: "National Admin", key: "national_admin" },
  { label: "Provincial Admin", key: "provincial_admin" },
  { label: "LGU Headmaster", key: "lgu_headmaster" },
  { label: "LGU Frontliner", key: "lgu_frontliner" },
  { label: "Citizen", key: "citizen" },
]

const ROLE_BADGES = {
  national_admin: { label: "National Admin", style: "bg-purple-100 text-purple-700 border-purple-200" },
  provincial_admin: { label: "Provincial Admin", style: "bg-blue-100 text-blue-700 border-blue-200" },
  lgu_headmaster: { label: "LGU Headmaster", style: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  lgu_frontliner: { label: "LGU Frontliner", style: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  citizen: { label: "Citizen", style: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

function LazyUserRow({ user, scrollRoot, onViewDetails }) {
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
    const timer = setTimeout(() => setState("loaded"), 250)
    return () => clearTimeout(timer)
  }, [state])

  const initials = (user.full_name || user.email || "U")
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("")

  const fallbackLabel = (user.role || "User").replace(/_/g, ' ')
  const roleConfig = ROLE_BADGES[user.role] || { label: fallbackLabel, style: "bg-gray-100 text-gray-700" }

  return (
    <TableRow ref={ref} style={state === "hidden" ? { visibility: "hidden", height: "64px" } : undefined}>
      {state === "hidden" ? (
        <>
          <TableData><div style={{ display: "none" }} /></TableData>
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
          <TableData><SingleLineSkeleton /></TableData>
          <TableDataAction><div style={{ width: "32px", height: "32px" }} /></TableDataAction>
        </>
      ) : (
        <>
          {/* User Name & Email */}
          <TableData>
            <div className="flex items-center gap-3">
              {user.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt={user.full_name || "User"} 
                  className="size-9 rounded-full object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <span className="inline-flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary text-xs font-extrabold shrink-0">
                  {initials}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-gray-800 text-sm truncate">{user.full_name || "Unnamed User"}</span>
                <span className="text-xs text-gray-400 truncate">{user.email || "No email"}</span>
              </div>
            </div>
          </TableData>

          {/* Role Badge */}
          <TableData>
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold capitalize ${roleConfig.style}`}>
              {roleConfig.label}
            </span>
          </TableData>

          {/* Location / Organization */}
          <TableDataMuted className="truncate max-w-[160px]">
            {user.organization_name || user.province?.name || user.municipality?.name || "Independent"}
          </TableDataMuted>

          {/* Mobile Number */}
          <TableDataMuted className="font-mono text-xs">
            {user.mobile_number || "N/A"}
          </TableDataMuted>

          {/* Verification Status */}
          <TableData>
            <TableBadge className={user.is_verified ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-500"}>
              {user.is_verified ? "VERIFIED" : "UNVERIFIED"}
            </TableBadge>
          </TableData>

          {/* Action */}
          <TableDataAction>
            <button 
              className="modal-icon-button hover:bg-gray-200"
              onClick={() => onViewDetails(user)}
              title="View profile details"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </TableDataAction>
        </>
      )}
    </TableRow>
  )
}

export default function ListofUsersTable() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeRoleFilter, setActiveRoleFilter] = useState("all")
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Search state with 3-second debouncing
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [selectedUser, setSelectedUser] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 3000)

    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeRoleFilter, debouncedSearch])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const allowedRoles = ["citizen", "provincial_admin", "national_admin", "lgu_headmaster", "lgu_frontliner"]

      const { data, error } = await supabase
        .from('profiles')
        .select('*, province:province_id(name), municipality:municipality_id(name)')
        .in('role', allowedRoles)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setUsers(data)
      }
    } catch (err) {
      console.error("Error fetching registered users:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()

    // Realtime channel subscription
    const channel = supabase
      .channel('profiles-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter users by active role tab and 3s debounced search
  const filteredUsers = useMemo(() => {
    let list = users

    if (activeRoleFilter !== "all") {
      list = list.filter(u => u.role === activeRoleFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      list = list.filter(u => {
        const nameMatch = u.full_name?.toLowerCase().includes(q)
        const emailMatch = u.email?.toLowerCase().includes(q)
        const phoneMatch = u.mobile_number?.toLowerCase().includes(q)
        const orgMatch = u.organization_name?.toLowerCase().includes(q)
        const provMatch = u.province?.name?.toLowerCase().includes(q)
        const muniMatch = u.municipality?.name?.toLowerCase().includes(q)
        return nameMatch || emailMatch || phoneMatch || orgMatch || provMatch || muniMatch
      })
    }

    return list
  }, [users, activeRoleFilter, debouncedSearch])
  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, currentPage])

  const [isDeactivating, setIsDeactivating] = useState(false)

  const handleToggleAccountStatus = async () => {
    if (!selectedUser?.id) return;

    const currentStatus = selectedUser.account_status?.toLowerCase();
    const isCurrentlyDeactivated = currentStatus === 'deactivate' || currentStatus === 'deactivated';
    const newStatus = isCurrentlyDeactivated ? 'active' : 'deactivate';

    setIsDeactivating(true);
    try {
      const res = await fetch('/api/users/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          status: newStatus
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update account status.');
      }

      setSelectedUser(prev => ({
        ...prev,
        account_status: newStatus
      }));

      setUsers(prev =>
        prev.map(u => u.id === selectedUser.id ? { ...u, account_status: newStatus } : u)
      );
    } catch (err) {
      console.error("Error updating account status:", err);
      alert(err.message || "Failed to update account status.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!selectedUser?.id) return;
    
    if (!window.confirm("Are you sure you want to permanently delete this account? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id })
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok && !result.success) {
        throw new Error(result.error || 'Failed to delete account.');
      }

      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setSelectedUser(null);
    } catch (err) {
      console.error("Error deleting account:", err);
      alert(err.message || "Failed to delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const activeTabConfig = ROLE_TABS.find(t => t.key === activeRoleFilter) || ROLE_TABS[0]

  return (
    <Table className="w-full min-w-0 overflow-visible">
      {/* Top Header Controls: Card-Styled Role Dropdown & 3s Debounced Search */}
      <TableHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        {/* Custom Card-Styled Role Dropdown Popover */}
        <div className="relative w-full sm:w-auto z-20">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full sm:w-64 flex items-center justify-between gap-3 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-xl px-3.5 py-2 shadow-2xs transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                <SlidersHorizontal className="size-3.5 text-primary" />
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Filter Role</span>
                <span className="text-xs font-extrabold text-gray-800 truncate mt-0.5">{activeTabConfig.label}</span>
              </div>
            </div>
            <ChevronDown className={`size-4 text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              {/* Dismissal Backdrop */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsDropdownOpen(false)} 
              />

              {/* Card Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-full sm:w-64 bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-2xl rounded-2xl p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-200 grid gap-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100/80">
                  Select User Role
                </div>
                {ROLE_TABS.map((tab) => {
                  const isSelected = activeRoleFilter === tab.key;
                  const badgeStyle = tab.key === 'all' 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : (ROLE_BADGES[tab.key]?.style || 'bg-gray-100 text-gray-700 border-gray-200');

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveRoleFilter(tab.key);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold ${badgeStyle}`}>
                        {tab.label}
                      </span>

                      {isSelected && (
                        <Check className="size-4 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <SearchInput 
            placeholder="Search users by name, email, phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm !== debouncedSearch && (
            <span className="text-xs text-amber-600 font-semibold animate-pulse shrink-0">
              Searching in 3s...
            </span>
          )}
        </div>
      </TableHeader>

      {/* Table Body */}
      <TableScrollWrapper ref={scrollRef}>
        <DataTable className="w-full min-w-[760px]">
          <TableHead>
            <tr>
              <Th>Registered User</Th>
              <Th>System Role</Th>
              <Th>Organization / Location</Th>
              <Th>Mobile Number</Th>
              <Th>Verification</Th>
              <Th className="table-th-right">Action</Th>
            </tr>
          </TableHead>

          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableDataAction><SingleLineSkeleton /></TableDataAction>
                </TableRow>
              ))
            ) : paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <LazyUserRow
                  key={user.id}
                  user={user}
                  scrollRoot={scrollRef.current}
                  onViewDetails={setSelectedUser}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm font-medium">
                  {debouncedSearch ? `No users matching "${debouncedSearch}"` : "No registered users found for this role."}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>
      
      {/* Pagination Controls */}
      {filteredUsers.length > itemsPerPage && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 bg-gray-50/50 sm:px-6 rounded-b-xl gap-4">
          <div className="hidden sm:block shrink-0">
            <p className="text-sm text-gray-600 whitespace-nowrap">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-medium text-gray-900">{filteredUsers.length}</span> results
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

      {/* User Details Side Modal */}
      {selectedUser && (
        <SideModal>
          {/* Header */}
          <div className="p-4 bg-white sticky top-0 flex justify-between items-center border-b border-gray-100 z-10">
            <div>
              <CardHeader className="text-lg text-gray-800">
                {selectedUser.full_name || "User Profile"}
              </CardHeader>
              <CardBasedText className="text-xs text-gray-400 font-medium">
                Registered Profile Details
              </CardBasedText>
            </div>
            <button 
              onClick={() => setSelectedUser(null)} 
              className="hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 grid gap-5 overflow-y-auto">
            {/* Status & Verification Banner */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                {selectedUser.profile_picture ? (
                  <img 
                    src={selectedUser.profile_picture} 
                    alt={selectedUser.full_name} 
                    className="size-12 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {(selectedUser.full_name || "U")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{selectedUser.full_name || "Unnamed User"}</h4>
                  <p className="text-xs text-gray-500">{selectedUser.email || "No primary email"}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold capitalize ${(ROLE_BADGES[selectedUser.role] || { style: "bg-gray-100 text-gray-700" }).style}`}>
                {(ROLE_BADGES[selectedUser.role] || { label: (selectedUser.role || "User").replace(/_/g, ' ') }).label}
              </span>
            </div>

            {/* Info Grid Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                <div className="flex items-center font-semibold gap-2">
                  <UserRoundCog className="text-primary size-4" />
                  <CardSubHeader>System Role</CardSubHeader>
                </div>
                <CardBasedText className="text-sm font-bold text-gray-800 capitalize">
                  {(ROLE_BADGES[selectedUser.role] || { label: (selectedUser.role || "User").replace(/_/g, ' ') }).label}
                </CardBasedText>
              </div>

              <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                <div className="flex items-center font-semibold gap-2">
                  <Shield className="text-primary size-4" />
                  <CardSubHeader>Verification</CardSubHeader>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedUser.is_verified ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">Verified Account</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">Unverified</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Organization */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                <div className="flex items-center font-semibold gap-2">
                  <MapPin className="text-primary size-4" />
                  <CardSubHeader>Province</CardSubHeader>
                </div>
                <CardBasedText className="text-sm font-semibold text-gray-800">
                  {selectedUser.province?.name || "Not assigned"}
                </CardBasedText>
              </div>

              <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                <div className="flex items-center font-semibold gap-2">
                  <Building className="text-primary size-4" />
                  <CardSubHeader>Organization</CardSubHeader>
                </div>
                <CardBasedText className="text-sm font-semibold text-gray-800">
                  {selectedUser.organization_name || "Independent"}
                </CardBasedText>
              </div>
            </div>

            {/* Mobile & Date Registered */}
            <div className="grid gap-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Phone className="size-3.5 text-primary" /> Phone Number
                </span>
                <span className="font-bold text-gray-800 font-mono">
                  {selectedUser.mobile_number || "Not specified"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> Account Status
                </span>
                <span className="font-bold text-gray-800 capitalize">
                  {selectedUser.account_status || "Active"}
                </span>
              </div>

              {selectedUser.created_at && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-gray-400" /> Joined Date
                  </span>
                  <span className="text-gray-600 font-medium">
                    {new Date(selectedUser.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white sticky bottom-0 z-10">
            <div className="flex items-center gap-2">
              {selectedUser.account_status?.toLowerCase() === 'deactivate' || selectedUser.account_status?.toLowerCase() === 'deactivated' ? (
                <button
                  type="button"
                  onClick={handleToggleAccountStatus}
                  disabled={isDeactivating || isDeleting}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeactivating ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                  <span>{isDeactivating ? "Updating..." : "Activate Account"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleAccountStatus}
                  disabled={isDeactivating || isDeleting}
                  className="px-4 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeactivating ? <Loader2 className="size-3.5 animate-spin" /> : <UserX className="size-3.5" />}
                  <span>{isDeactivating ? "Deactivating..." : "Deactivate Account"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || isDeactivating}
                className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>{isDeleting ? "Deleting..." : "Delete Account"}</span>
              </button>
            </div>

            <button 
              onClick={() => setSelectedUser(null)}
              className="px-5 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </SideModal>
      )}
    </Table>
  )
}
