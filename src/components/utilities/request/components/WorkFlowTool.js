"use client"
import { useState } from "react"
import PrimaryButton from "@/components/button/PrimaryButton"
import CardBasedText from "@/components/cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"
import { normalizeRequestStatus, statusVariants } from "@/lib/domain-values.mjs"

export default function WorkFlowTool({ status, requestId, allocations, onStatusChange, onApprove, userId }) {
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

          // Update allocations batch
          const { error: allocError } = await supabase
              .from('resource_allocations')
              .update({ batch: 'In_Transit', dispatched_at: new Date().toISOString() })
              .eq('request_id', requestId)
              .in('batch', statusVariants(['Pending_Dispatch']))
          
          if (allocError) throw allocError

          // Update the request status to In_Transit
          const { error: requestError } = await supabase
              .from('resource_requests')
              .update({ status: 'In_Transit' })
              .eq('request_id', requestId)
          if (requestError) throw requestError

          if (userId) {
             await supabase.from("notifications").insert({
               user_id: userId,
               title: "Resources In Transit",
               message: "Your requested resources are now in transit. Please remember to click 'Mark as Received' once they arrive.",
               type: "Updates",
               target_role: "lgu"
             });
          }

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

          // Update allocations batch
          const { error: allocError } = await supabase
              .from('resource_allocations')
              .update({ batch: 'Returned', returned_at: new Date().toISOString() })
              .eq('request_id', requestId)
              .in('batch', statusVariants(['In_Transit', 'Received', 'Returning']))
          
          if (allocError) throw allocError

          // Update the request status to Returned (fully completed)
          const { error: requestError } = await supabase
              .from('resource_requests')
              .update({ status: 'Returned' })
              .eq('request_id', requestId)
          if (requestError) throw requestError

          if (userId) {
             await supabase.from("notifications").insert({
               user_id: userId,
               title: "Items Returned",
               message: "The PDRRMO has confirmed that the returned resources have been received. Thank you for your service!",
               type: "Updates",
               target_role: "lgu"
             });
          }

          onStatusChange?.()
      } catch (error) {
          console.error('Failed to mark returned:', error)
      } finally {
          setIsLoading(false)
      }
  }

  const normalizedStatus = normalizeRequestStatus(status)
  const isPending = normalizedStatus === 'Pending'
  const isAllocated = ['Fully_Allocated', 'Partially_Allocated', 'Pending_Dispatch', 'In_Transit', 'Received'].includes(normalizedStatus)
  
  const hasPendingDispatch = allocations?.some(a => normalizeRequestStatus(a.batch || a.status) === 'Pending_Dispatch')
  const hasDeployed = allocations?.some(a => ['In_Transit', 'Received', 'Returning'].includes(normalizeRequestStatus(a.batch || a.status)) || a.dispatched_at)
  const isAllReturned = allocations?.length > 0 && allocations?.every(a => a.returned_at || normalizeRequestStatus(a.batch || a.status) === 'Returned')
  const isStillInTransit = allocations?.some(a => !a.received_at && !a.delivered_at && !a.returned_at && !['Received', 'Returned', 'Returning'].includes(normalizeRequestStatus(a.batch || a.status)) && (normalizeRequestStatus(a.batch || a.status) === 'In_Transit' || a.dispatched_at))

  // Determine dynamic message
  let subText = "Choose an action to proceed";
  if (!isPending) {
      if (isAllReturned) {
          subText = "All resources have been successfully returned.";
      } else if (hasDeployed) {
          subText = isStillInTransit 
              ? "Resources are in transit. Waiting for LGU to receive them before they can be returned."
              : "Resources are currently deployed. Mark as returned when they arrive back.";
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
                    disabled={isLoading || isStillInTransit} 
                    className={`text-xs ${isStillInTransit ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    title={isStillInTransit ? "Waiting for LGU to mark as received" : ""}
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
