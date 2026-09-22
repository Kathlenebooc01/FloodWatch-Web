"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import { Archive } from "lucide-react"
import CardHeader from "@/components/cards/CardHeader"

export default function TotalUtilities() {
  const [total, setTotal] = useState(0)
  const [thisMonth, setThisMonth] = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      // Total count
      const { count } = await supabase.from('utilities').select('*', { count: 'exact', head: true })
      setTotal(count || 0)

      // This month count
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count: monthCount } = await supabase
        .from('utilities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
      setThisMonth(monthCount || 0)
    }
    fetchCounts()
  }, [])

  return (
    <GeneralCard className='grid gap-5'>
        <div className="flex items-center justify-between">
            <div className="text-gray-500 font-semibold">
                <CardBasedText>Total Utilities</CardBasedText>
            </div>
            <div className="summary-data-icon">
                <Archive className="size-5"/>
            </div>
            
        </div>
        <div className="grid gap-1">
            <CardHeader className='text-3xl font-semibold'>{total}</CardHeader>
            <CardBasedText className='text-xs text-gray-500 font-semibold'>
              <span className="text-green-500">+{thisMonth}</span> from this month
            </CardBasedText>
        </div>
    </GeneralCard>
  )
}
