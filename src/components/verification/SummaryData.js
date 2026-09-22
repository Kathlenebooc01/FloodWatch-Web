"use client"
import { useState, useEffect } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardBasedText from "../cards/CardBasedText"
import CardSubHeader from "../cards/CardSubHeader"
import CardHeader from "../cards/CardHeader"
import { FileText, FileClock, BadgeCheck, BadgeAlert } from "lucide-react"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { supabase } from "@/supabase/util/supabase"

export default function SummaryData() {
  const [counts, setCounts] = useState({ total: 0, pending: 0, verified: 0, unverified: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const fetchCounts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)

    const { data, error } = await supabase
      .from('id_verification')
      .select('status')

    if (error) {
      console.error("Error fetching verification counts:", error)
    }

    const records = data || []
    setCounts({
      total: records.length,
      pending: records.filter((r) => r.status === 'pending').length,
      verified: records.filter((r) => r.status === 'approved').length,
      unverified: records.filter((r) => r.status === 'rejected' || r.status === 'unverified').length,
    })

    if (showLoading) setIsLoading(false)
  }

  useEffect(() => {
    fetchCounts()

    // Listen for custom events from the modal for immediate sibling updates
    const handleLocalUpdate = () => fetchCounts(false)
    window.addEventListener('verification_status_updated', handleLocalUpdate)

    // Supabase real-time listener (works if realtime is enabled on the table)
    const channel = supabase
      .channel('summary_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'id_verification' }, (payload) => {
        // Fetch fresh counts when changes occur in the table silently
        fetchCounts(false)
      })
      .subscribe()

    return () => {
      window.removeEventListener('verification_status_updated', handleLocalUpdate)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-1 lg:gap-3">
        <GeneralCard className='grid gap-3 p-5'>
            <div className="flex justify-between items-center">
                <div className="summary-data-icon">
                    <FileText className="size-5"/>
                </div>
                <CardBasedText className='summary-data-icon text-xs px-3 font-semibold'>Total</CardBasedText>
            </div>
            <div>
                <CardBasedText className="font-semibold text-gray-500">Total Submitted</CardBasedText>
                <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : counts.total}</CardHeader>
            </div>
            
        </GeneralCard>
         <GeneralCard className='grid gap-3 p-5'>
            <div className="flex justify-between items-center">
                <div className="summary-data-icon-amber">
                    <FileClock className="size-5"/>
                </div>
                <CardBasedText className='summary-data-icon-amber text-xs px-3 font-semibold'>Pending</CardBasedText>
            </div>
            <div>
                <CardBasedText className="font-semibold text-gray-500">Pending Verification</CardBasedText>
                <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : counts.pending}</CardHeader>
            </div>
            
        </GeneralCard>
         <GeneralCard className='grid gap-3 p-5'>
            <div className="flex justify-between items-center">
                <div className="summary-data-icon-green">
                    <BadgeCheck className="size-5"/>
                </div>
                <CardBasedText className='summary-data-icon-green text-xs px-3 font-semibold'>Accepted</CardBasedText>
            </div>
            <div>
                <CardBasedText className="font-semibold text-gray-500">Total Accepted</CardBasedText>
                <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : counts.verified}</CardHeader>
            </div>
            
        </GeneralCard>
         <GeneralCard className='grid gap-3 p-5'>
            <div className="flex justify-between items-center">
                <div className="summary-data-icon-red">
                    <BadgeAlert className="size-5"/>
                </div>
                <CardBasedText className='summary-data-icon-red text-xs px-3 font-semibold'>Rejected</CardBasedText>
            </div>
            <div>
                <CardBasedText className="font-semibold text-gray-500">Total Rejected</CardBasedText>
                <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : counts.unverified}</CardHeader>
            </div>
            
        </GeneralCard>
      
    </section>
  )
}
