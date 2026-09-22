"use client"
import TableScrollWrapper from "@/components/table/TableScrollWrapper"
import Table from "@/components/table/Table"
import DataTable from "@/components/table/DataTable"
import TableHead from "@/components/table/TableHead"
import Th from "@/components/table/Th"
import TableRow from "@/components/table/TableRow"
import TableData from "@/components/table/TableData"
import TableDataMuted from "@/components/table/TableDataMuted"
import TableDataAction from "@/components/table/TableDataAction"
import { ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"

const statusStyles = {
  Pending: 'summary-data-icon-yellow',
  Partially_Allocated: 'summary-data-icon-blue',
  Fully_Allocated: 'summary-data-icon-green',
  Rejected: 'summary-data-icon-red',
}

export default function RequestTable() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchRequests = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const { data: requests, error } = await supabase
        .from('resource_requests')
        .select('*, profiles!resource_requests_requested_by_fkey(full_name), municipality_or_city(name)')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error("Supabase fetch error:", error)
      } else if (requests) {
        setData(requests)
      }
    } catch (error) {
      console.error(error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()

    // Real-time subscription
    const channel = supabase
      .channel('resource_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, () => {
        fetchRequests(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Table className="w-full min-w-0 overflow-hidden">
      <TableScrollWrapper>
        <DataTable className="w-full min-w-[680px]">
          <TableHead>
            <tr>
              <Th>Requestor</Th>
              <Th>Municipality</Th>
              <Th>Status</Th>
              <Th>Requested At</Th>
              <Th>Action</Th>
            </tr>
          </TableHead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((skeleton) => (
                <TableRow key={skeleton}>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableDataAction><SingleLineSkeleton /></TableDataAction>
                </TableRow>
              ))
            ) : data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.request_id}>
                  <TableData>{item.profiles?.full_name || 'Unknown'}</TableData>
                  <TableDataMuted>{item.municipality_or_city?.name || 'N/A'}</TableDataMuted>
                  <TableData>
                    <span className={`${statusStyles[item.status] || ''} px-3 py-1 text-xs font-semibold capitalize`}>
                      {item.status}
                    </span>
                  </TableData>
                  <TableDataMuted className='truncate max-w-[200px]'>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableDataMuted>
                  <TableDataAction>
                    <button
                      onClick={() => router.push(`/provincial-admin/utilities/request/view-request?id=${item.request_id}`)}
                      className="modal-icon-button"
                    >
                      <ChevronRight className="size-5"/>
                    </button>
                  </TableDataAction>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No requests found</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>
    </Table>
  )
}
