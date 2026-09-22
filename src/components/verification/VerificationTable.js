"use client"
import { useState, useEffect, useMemo } from "react"
import CardSubHeader from "../cards/CardSubHeader"
import ToogleButton from "../button/ToogleButton"
import ToogleButtonLayout from "../button/ToogleButtonLayout"
import TableHeader from "../table/TableHeader"
import Table from "../table/Table"
import TableScrollWrapper from "../table/TableScrollWrapper"
import TableHead from "../table/TableHead"
import DataTable from "../table/DataTable"
import Th from "../table/Th"
import TableRow from "../table/TableRow"
import TableData from "../table/TableData"
import TableDataMuted from "../table/TableDataMuted"
import TableBadge from "../table/TableBadge"
import TableDataAction from "../table/TableDataAction"
import { Eye, ChevronRight } from "lucide-react"
import VerificationTableModal from "./VerificationTableModal"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { supabase } from "@/supabase/util/supabase"

const TABS = ["All", "Pending", "Approved", "Rejected", "Unverified"]

export default function VerificationTable() {
  const [selectedRow, setSelectedRow] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [verifications, setVerifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("All")

  const fetchVerifications = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)

    const { data, error } = await supabase
      .from("id_verification")
      .select('*')
      .order("is_read", { ascending: true })
      .order("submitted_at", { ascending: false })

    if (data) {
      setVerifications(data)
    } else if (error) {
      console.error("Error fetching verifications:", error)
    }

    if (showLoading) setIsLoading(false)
  }

  useEffect(() => {
    fetchVerifications()

    // Real-time subscription
    const channel = supabase
      .channel('id_verification_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'id_verification' }, (payload) => {
        // Fetch fresh data when changes occur in the table
        fetchVerifications(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeTab === "All") return verifications
    return verifications.filter((row) => row.status.toLowerCase() === activeTab.toLowerCase())
  }, [activeTab, verifications])

  const handleOpenModal = async (row) => {
    setSelectedRow(row)
    setIsModalOpen(true)

    // Automatically mark as read if it is unread
    if (!row.is_read) {
      const { error } = await supabase
        .from('id_verification')
        .update({ is_read: true })
        .eq('id_verification_id', row.id_verification_id)
        
      if (!error) {
        // Fetch to update the table immediately and re-sort
        fetchVerifications(false)
      } else {
        console.error("Error marking as read:", error)
      }
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedRow(null)
  }

  const getStatusBadge = (status) => {
    const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : ''
    switch (status?.toLowerCase()) {
      case 'verified':
      case 'approved':
        return <TableBadge className="bg-green-500/10 text-green-500">{formattedStatus}</TableBadge>
      case 'pending':
        return <TableBadge className="bg-amber-500/10 text-amber-500">{formattedStatus}</TableBadge>
      default:
        return <TableBadge className="bg-red-500/10 text-red-500">{formattedStatus}</TableBadge>
    }
  }

  return (
    <div className="table-container mt-6">
      <TableHeader className="flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center h-full">
          <CardSubHeader className="!mb-0 leading-none self-center">ID Verifications</CardSubHeader>
        </div>
        <ToogleButtonLayout className="w-full sm:w-auto overflow-x-auto">
          {TABS.map((tab) => (
            <ToogleButton
              key={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </ToogleButton>
          ))}
        </ToogleButtonLayout>
      </TableHeader>

      <TableScrollWrapper>
        <DataTable>
          <TableHead>
            <TableRow>
              {/* CHANGED: Header is now User ID instead of Name */}
              <Th>User ID</Th>
              <Th>ID Type</Th>
              <Th>Submitted At</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
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
            ) : filtered.length > 0 ? (
              filtered.map((row) => (
                <TableRow key={row.id_verification_id}>
                  {/* CHANGED: Displaying a shortened user_id since full_name is unavailable */}
                  <TableData className="font-medium text-gray-800" title={row.user_id}>
                    {row.user_id ? `${row.user_id.substring(0, 8)}...` : "Unknown"}
                  </TableData>
                  <TableDataMuted>{row.id_type}</TableDataMuted>
                  <TableDataMuted>{new Date(row.submitted_at).toLocaleString()}</TableDataMuted>
                  <TableData>{getStatusBadge(row.status)}</TableData>
                  <TableDataAction>
                    <button 
                      onClick={() => handleOpenModal(row)}
                      className="table-action-btn"
                      title="View Details"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </TableDataAction>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 text-sm py-10">
                  No verifications found.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>

      {isModalOpen && selectedRow && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={handleCloseModal}></div>
          <VerificationTableModal 
            data={selectedRow} 
            onClose={handleCloseModal}
            onStatusUpdate={() => fetchVerifications(false)} 
          />
        </>
      )}
    </div>
  )
}