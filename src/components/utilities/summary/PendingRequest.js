"use client"
import { useState, useEffect } from "react"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import { Package } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function PendingRequest() {
  const [count, setCount] = useState(0)

  const fetchCount = async () => {
    const { count: pendingCount, error } = await supabase
      .from('resource_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Pending', 'pending'])
    
    if (!error && pendingCount !== null) {
      setCount(pendingCount)
    }
  }

  useEffect(() => {
    fetchCount()
    
    const channel = supabase
      .channel('pending-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, fetchCount)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <GeneralCard className='grid gap-5'>
       <div className="flex justify-between items-center">
           <div className=" text-gray-500 font-semibold">
               <CardBasedText>Pending Requests</CardBasedText>
           </div>
           <div className="summary-data-icon-amber">
               <Package className="size-5"/>
           </div>
       </div>
       <div className="grid gap-1">
           <CardHeader>{count}</CardHeader>
           <CardBasedText className='text-amber-500 font-semibold text-xs'>Requires Attention</CardBasedText>
       </div>
    </GeneralCard>
  )
}