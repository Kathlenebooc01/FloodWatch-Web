"use client"
import { useState, useEffect } from "react"
import GeneralCard from "@/components/cards/GeneralCard";
import CardBasedText from "@/components/cards/CardBasedText";
import CardHeader from "@/components/cards/CardHeader";
import { Boxes } from "lucide-react";
import { supabase } from "@/supabase/util/supabase"

export default function TotalRequest() {
  const [count, setCount] = useState(0)

  const fetchCount = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.toISOString();

    const { count: totalCount, error } = await supabase
      .from('resource_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday)
    
    if (!error && totalCount !== null) {
      setCount(totalCount)
    }
  }

  useEffect(() => {
    fetchCount()
    
    const channel = supabase
      .channel('total-requests-changes')
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
                <CardBasedText>Total Requests</CardBasedText>
            </div>
            <div className="summary-data-icon">
                <Boxes className="size-5"/>
            </div>
        </div>
        <div className="grid gap-1">
            <CardHeader>{count}</CardHeader>
            <CardBasedText className='text-primary font-semibold text-xs'>Total Requests Today</CardBasedText>
        </div>
     </GeneralCard>
  )
}
