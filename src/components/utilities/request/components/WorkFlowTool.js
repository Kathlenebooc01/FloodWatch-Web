"use client"
import { useState } from "react"
import PrimaryButton from "@/components/button/PrimaryButton"
import CardBasedText from "@/components/cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"

export default function WorkFlowTool({ status, requestId, allocations, onStatusChange, onApprove }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleReject = async () => {
    try {
        setIsLoading(true)
        const { error } = await supabase
            .from('resource_requests')
            .update({ status: 'Rejected' })
            .eq('request_id', requestId)
        
        if (error) throw error
        onStatusChange?.()
    } catch (error) {
        console.error('Failed to reject:', error)
    } finally {
        setIsLoading(false)
    }
  }

  const handleMarkInTransit = async () => {
      try {
          setIsLoading(true)
          const { error } = await supabase
              .from('resource_allocations')
              .update({ batch: 'In_Transit', dispatched_at: new Date().toISOString() })
              .eq('request_id', requestId)
              .eq('batch', 'Pending_Dispatch') // Update all pending batches to In Transit
          
          if (error) throw error
          onStatusChange?.()
      } catch (error) {
          console.error('Failed to mark in transit:', error)
      } finally {
          setIsLoading(false)
      }
  }

  const handleMarkReturned = async () => {
      try {
          setIsLoading(true)
          const { error } = await supabase
              .from('resource_allocations')
              .update({ batch: 'Returned', returned_at: new Date().toISOString() })
              .eq('request_id', requestId)
              .in('batch', ['In_Transit', 'Received']) // Update deployed batches to Returned
          
          if (error) throw error
          onStatusChange?.()
      } catch (error) {
          console.error('Failed to mark returned:', error)
      } finally {
          setIsLoading(false)
      }
  }

  const isPending = status?.toLowerCase() === 'pending'
  const isAllocated = status?.toLowerCase() === 'fully_allocated' || status?.toLowerCase() === 'partially_allocated'
  
  const hasPendingDispatch = allocations?.some(a => a.batch === 'Pending_Dispatch')
  const hasDeployed = allocations?.some(a => a.batch === 'In_Transit' || a.batch === 'Received')
  const isAllReturned = allocations?.length > 0 && allocations?.every(a => a.batch === 'Returned')

  // Determine dynamic message
  let subText = "Choose an action to proceed";
  if (!isPending) {
      if (isAllReturned) {
          subText = "All resources have been successfully returned.";
      } else if (hasDeployed) {
          subText = "Resources are currently deployed. Mark as returned when they arrive back.";
      } else if (hasPendingDispatch) {
          subText = "Resources are allocated. Dispatch them when ready.";
      } else {
          subText = `Request has been ${status}`;
      }
  }

  return (
    <section className="bg-gray-100 p-5 flex justify-between items-center rounded-lg">
        <div>
            <CardBasedText>WorkFlow Tool</CardBasedText>
            <CardBasedText className="text-gray-500 text-xs">{subText}</CardBasedText>
        </div>
        <div className="flex justify-end items-center gap-2">
            {isPending && (
                <>
                    <button 
                        onClick={handleReject} 
                        disabled={isLoading}
                        className="px-5 py-2 text-red-500 font-semibold text-xs hover:bg-red-500/10 disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Reject'}
                    </button>
                    <PrimaryButton 
                        onClick={onApprove}
                        disabled={isLoading} 
                        className='text-xs'
                    >
                        Accept & Proceed
                    </PrimaryButton>
                </>
            )}

            {isAllocated && hasPendingDispatch && (
                <PrimaryButton 
                    onClick={handleMarkInTransit}
                    disabled={isLoading} 
                    className='text-xs bg-blue-500 hover:bg-blue-600'
                >
                    {isLoading ? 'Loading...' : 'Mark as In Transit'}
                </PrimaryButton>
            )}

            {isAllocated && hasDeployed && (
                <PrimaryButton 
                    onClick={handleMarkReturned}
                    disabled={isLoading} 
                    className='text-xs bg-emerald-500 hover:bg-emerald-600'
                >
                    {isLoading ? 'Loading...' : 'Mark as Returned'}
                </PrimaryButton>
            )}

            {!isPending && !isAllocated && (
                <CardBasedText className="text-gray-500 text-sm font-semibold capitalize">
                    Request has been {status}
                </CardBasedText>
            )}
        </div>
    </section>
  )
}
