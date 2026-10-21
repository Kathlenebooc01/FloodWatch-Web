"use client"
import { useEffect, useState } from "react"
import PrimaryButton from "@/components/button/PrimaryButton"
import CardBasedText from "@/components/cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"
import { normalizeRequestStatus, statusVariants } from "@/lib/domain-values.mjs"
import { daysOverdue, requestDueDate } from "@/lib/utilities/overdue.mjs"

const flagReasons = [
  'Failure to Return Utilities on Time',
  'Unreturned Borrowed Equipment',
  'Partial Return of Borrowed Utilities',
  'Failure to Follow the Agreed Return Schedule',
  'No Response Regarding Overdue Utilities',
  'Other (Specify Reason)',
]

export default function WorkFlowTool({ status, requestId, allocations, returnConfirmedAt, onStatusChange, onApprove, userId, headmasterName, isHeadmaster, municipality, items, activeFlag }) {
  const [isLoading, setIsLoading] = useState(false)
  const [flagAction, setFlagAction] = useState(null)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [flagError, setFlagError] = useState('')
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const dueDate = requestDueDate(items, allocations)
  const overdueDays = daysOverdue(dueDate, today)
  const fullyReturned = Boolean(returnConfirmedAt) && allocations?.length > 0 &&
    allocations.every(a => a.returned_at && normalizeRequestStatus(a.batch || a.status) === 'Returned')
  const canUnflag = Boolean(activeFlag) && fullyReturned

  const submitFlagAction = async () => {
    setFlagError('')
    const selectedReason = reason === 'Other (Specify Reason)' ? otherReason.trim() : reason
    if (flagAction === 'flag' && !selectedReason) {
      setFlagError('Select a reason for flagging.')
      return
    }
    try {
      setIsLoading(true)
      const { error } = flagAction === 'flag'
        ? await supabase.rpc('flag_overdue_utility_request', {
            p_request_id: requestId, p_reason: selectedReason, p_remarks: remarks.trim() || null,
          })
        : await supabase.rpc('clear_overdue_utility_flag', { p_flag_id: activeFlag.flag_id })
      if (error) throw error
      setFlagAction(null)
      setReason('')
      setOtherReason('')
      setRemarks('')
      onStatusChange?.()
    } catch (error) {
      setFlagError(error.message || 'Unable to update flag.')
    } finally {
      setIsLoading(false)
    }
  }

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

          const { error } = await supabase.rpc('confirm_resource_return', { p_request_id: requestId })
          if (error) throw error

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
  const isAllocated = ['Fully_Allocated', 'Partially_Allocated', 'Pending_Dispatch', 'In_Transit', 'Received', 'Returning', 'Returned'].includes(normalizedStatus)
  
  const hasPendingDispatch = allocations?.some(a => normalizeRequestStatus(a.batch || a.status) === 'Pending_Dispatch')
  const hasDeployed = allocations?.some(a => ['In_Transit', 'Received', 'Returning', 'Returned'].includes(normalizeRequestStatus(a.batch || a.status)) || a.dispatched_at)
  const canFlag = overdueDays > 0 && hasDeployed && !returnConfirmedAt && !activeFlag
  const isAllReturned = Boolean(returnConfirmedAt) && allocations?.length > 0 && allocations?.every(a => a.returned_at || normalizeRequestStatus(a.batch || a.status) === 'Returned')
  const isStillInTransit = allocations?.some(a => !a.received_at && !a.delivered_at && !a.returned_at && !['Received', 'Returned', 'Returning'].includes(normalizeRequestStatus(a.batch || a.status)) && (normalizeRequestStatus(a.batch || a.status) === 'In_Transit' || a.dispatched_at))
  const isReadyToReturn = !returnConfirmedAt && allocations?.length > 0 &&
      (normalizedStatus === 'Returning' || allocations.some(a =>
          a.returned_at || normalizeRequestStatus(a.batch) === 'Returning'))

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
    <>
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
                    disabled={isLoading || !isReadyToReturn}
                    className={`text-xs ${!isReadyToReturn ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    title={!isReadyToReturn ? "Waiting for LGU to return resources to PDRRMO" : ""}
                >
                    {isLoading ? 'Loading...' : 'Mark as Returned'}
                </PrimaryButton>
            )}

            {isHeadmaster && isAllocated && hasDeployed && dueDate && (
                <button type="button" onClick={() => { setFlagError(''); setFlagAction('flag') }}
                    disabled={isLoading || !canFlag}
                    className={`rounded-lg px-5 py-2 text-xs font-semibold text-white ${canFlag ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 opacity-60 cursor-not-allowed'}`}>
                    Flag LGU
                </button>
            )}
            {activeFlag && (
                <button type="button" onClick={() => { setFlagError(''); setFlagAction('unflag') }}
                    disabled={isLoading || !canUnflag}
                    className="rounded-lg px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    Unflag LGU
                </button>
            )}

            {!isPending && !isAllocated && (
                <CardBasedText className="text-gray-500 text-sm font-semibold capitalize">
                    Request has been {status}
                </CardBasedText>
            )}
        </div>
    </section>
    {flagAction && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !isLoading) setFlagAction(null) }}>
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="utility-flag-title">
          <h2 id="utility-flag-title" className="text-lg font-bold">{flagAction === 'flag' ? 'Flag Overdue LGU' : 'Remove LGU Flag'}</h2>
          {flagAction === 'flag' ? (
            <div className="mt-4 space-y-3 text-sm">
              <p><strong>LGU Headmaster:</strong> {headmasterName || 'Unknown'}</p>
              <p><strong>Municipality/City:</strong> {municipality || 'Unknown'}</p>
              <p><strong>Utility Request Number:</strong> {requestId?.slice(0, 8)}</p>
              <p><strong>Requested Utilities:</strong> {items?.map(item => `${item.utilities?.name || 'Utility'} (${item.quantity_requested})`).join(', ') || 'None'}</p>
              <p><strong>Expected Return Date:</strong> {new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long' }).format(new Date(dueDate))}</p>
              <p><strong>Days Overdue:</strong> {overdueDays}</p>
              <label className="block">Reason for Flagging <span className="text-red-600">*</span>
                <select value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded border p-2">
                  <option value="">Select a reason</option>
                  {flagReasons.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              {reason === 'Other (Specify Reason)' && <label className="block">Specify Reason <span className="text-red-600">*</span>
                <input value={otherReason} onChange={event => setOtherReason(event.target.value)} className="mt-1 w-full rounded border p-2" />
              </label>}
              <label className="block">Additional Remarks
                <textarea value={remarks} onChange={event => setRemarks(event.target.value)} className="mt-1 w-full rounded border p-2" />
              </label>
            </div>
          ) : <p className="mt-4 text-sm">Are you sure you want to remove this flag? The LGU Headmaster will regain utility request privileges if no other active flags remain.</p>}
          {flagError && <p role="alert" className="mt-3 text-sm text-red-600">{flagError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={isLoading} onClick={() => setFlagAction(null)} className="rounded border px-4 py-2 text-sm">Cancel</button>
            <button type="button" disabled={isLoading} onClick={submitFlagAction} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : flagAction === 'flag' ? 'Confirm Flag' : 'Confirm Unflag'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
