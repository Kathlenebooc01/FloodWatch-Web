"use client"
import { useState, useEffect } from "react"
import GeneralCard from "@/components/cards/GeneralCard"
import CardSubHeader from "@/components/cards/CardSubHeader"
import RequestStatus from "./components/RequestStatus"
import StatusBar from "./components/StatusBar"
import CardBasedText from "@/components/cards/CardBasedText"
import LogisticsLocationMap from "./components/LogisticsLocationMap"
import RequestDetails from "./components/RequestDetails"
import WorkFlowTool from "./components/WorkFlowTool"
import LogisticsDetail from "./components/LogisticsDetail"
import ApprovedandDispatchSideModal from "./components/ApprovedandDispatchSideModal"
import { supabase } from "@/supabase/util/supabase"

export default function ViewRequesDetails({ id }) {
  const [request, setRequest] = useState(null)
  const [items, setItems] = useState([])
  const [allocations, setAllocations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const refetchData = async () => {
    setIsLoading(true)
    try {
      const { data: reqData } = await supabase
        .from('resource_requests')
        .select('*')
        .eq('request_id', id)
        .single()
      setRequest(reqData)

      const { data: itemsData } = await supabase
        .from('resource_request_items')
        .select('*, utilities:utilities_id(name, type)')
        .eq('request_id', id)
      setItems(itemsData || [])

      const { data: allocData } = await supabase
        .from('resource_allocations')
        .select('*, profiles:approved_by(full_name)')
        .eq('request_id', id)
        .order('batch', { ascending: true })
      setAllocations(allocData || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    refetchData()

    const channel = supabase
      .channel(`request-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests', filter: `request_id=eq.${id}` }, refetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations', filter: `request_id=eq.${id}` }, refetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const mapStatusToStatusBar = (status, allocs) => {
    if (!allocs || allocs.length === 0) return 'Pending_Dispatch'
    
    if (allocs.some(a => a.returned_at)) return 'Returned'
    if (allocs.some(a => a.received_at)) return 'Received'
    if (allocs.some(a => a.dispatched_at)) return 'In_Transit'
    
    return 'Pending_Dispatch'
  }

  if (isLoading) return <div className="p-5 text-gray-500">Loading details...</div>

  return (
    <GeneralCard className='grid gap-5'>
        <div className="flex justify-between items-center">
            <CardSubHeader className='text-gray-600'>Request Details</CardSubHeader>
            <RequestStatus status={request?.status}/>
        </div>
        <div>
            <CardBasedText className='font-semibold text-gray-500'>Logistics Details</CardBasedText>
            <StatusBar currentStatus={mapStatusToStatusBar(request?.status, allocations)}/>
            <LogisticsLocationMap/>
        </div>
        <div>
            <RequestDetails requestId={id} items={items} dropOffAddress={request?.drop_off_address}/>
        </div>
        <div>
            <LogisticsDetail allocations={allocations}/>
        </div>
        <div>
            <WorkFlowTool status={request?.status} requestId={id} allocations={allocations} onStatusChange={refetchData} onApprove={() => setIsModalOpen(true)}/>
        </div>
        <ApprovedandDispatchSideModal 
            requestId={id} 
            items={items} 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={refetchData}
        />
    </GeneralCard>
  )
}
