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
import SearchInput from "@/components/forms/SearchInput"
import { ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import UtilTableModal from "./table-modal/UtilTableModal"

export default function UtilTable() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)

  // Search and 3-second debouncing state
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 3000)

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  const fetchUtilities = async () => {
    setIsLoading(true)
    try {
      const { data: utilities } = await supabase
        .from('utilities')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (utilities) {
        setData(utilities)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUtilities()
  }, [])

  // Filter items based on debouncedSearch
  const filteredData = data.filter((item) => {
    if (!debouncedSearch.trim()) return true
    const q = debouncedSearch.toLowerCase().trim()
    const nameMatch = item.name?.toLowerCase().includes(q)
    const typeMatch = item.type?.toLowerCase().includes(q)
    const serialMatch = item.serial_number?.toLowerCase().includes(q)
    const profileMatch = item.profiles?.full_name?.toLowerCase().includes(q)
    return nameMatch || typeMatch || serialMatch || profileMatch
  })

  return (
    <Table className="w-full min-w-0 overflow-hidden">
      {/* Search Input Bar with 3s Debouncing */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
        <SearchInput 
          placeholder="Search utilities by name, type, or serial..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm !== debouncedSearch && (
          <span className="text-xs text-amber-600 font-semibold animate-pulse shrink-0">
            Searching in 3s...
          </span>
        )}
      </div>

      <TableScrollWrapper>
        <DataTable className="w-full min-w-[680px]">
          <TableHead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Serial Number</Th>
              <Th>Quantity</Th>
              <Th>Added By</Th>
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
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableDataAction><SingleLineSkeleton /></TableDataAction>
                </TableRow>
              ))
            ) : filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableData className="font-semibold text-gray-800">{item.name}</TableData>
                  <TableDataMuted>{item.type}</TableDataMuted>
                  <TableDataMuted className="font-mono text-xs">{item.serial_number || 'N/A'}</TableDataMuted>
                  <TableData>
                    <span className={`px-3 py-1 font-bold rounded-lg text-xs ${
                      item.quantity <= 3 
                        ? "bg-red-50 text-red-700 border border-red-200" 
                        : "bg-primary/10 text-primary"
                    }`}>
                      {item.quantity} units
                    </span>
                  </TableData>
                  <TableDataMuted className="truncate max-w-[120px]">
                    {item.profiles?.full_name || 'System'}
                  </TableDataMuted>
                  <TableDataAction>
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="modal-icon-button hover:bg-gray-200"
                      title="View details"
                    >
                      <ChevronRight className="size-5"/>
                    </button>
                  </TableDataAction>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm font-medium">
                  {debouncedSearch ? `No utilities matching "${debouncedSearch}"` : "No utilities found"}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>

      {/* Side Modal */}
      {selectedItem && (
        <UtilTableModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onDeleteSuccess={() => {
            setSelectedItem(null)
            fetchUtilities()
          }}
        />
      )}
    </Table>
  )
}
