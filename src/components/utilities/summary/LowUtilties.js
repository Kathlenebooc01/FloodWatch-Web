"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import CardHeader from "@/components/cards/CardHeader"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import { SquareArrowOutDownRight } from "lucide-react"

export default function LowUtilties() {
  const [lowCount, setLowCount] = useState(0)

  useEffect(() => {
    const fetchLowCount = async () => {
      const { count } = await supabase
        .from('utilities')
        .select('*', { count: 'exact', head: true })
        .lte('quantity', 3)
      
      setLowCount(count || 0)
    }
    fetchLowCount()
  }, [])

  return (
    <GeneralCard className='grid gap-5'>
        <div className="flex justify-between items-center">
            <div className=" text-gray-500 font-semibold">
                <CardBasedText>Low Stock Utilities</CardBasedText>
            </div>
            <div className="summary-data-icon-red">
                <SquareArrowOutDownRight className="size-5"/>
            </div>
        </div>
        <div className="grid gap-1">
            <CardHeader>{lowCount}</CardHeader>
            <CardBasedText className='text-red-500 font-semibold text-xs'>Requires Attention</CardBasedText>
        </div>
     </GeneralCard>
  )
}
