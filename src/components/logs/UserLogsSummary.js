"use client"

import { useEffect, useState } from "react"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import { Activity,BadgeCheck,ShieldBan } from "lucide-react"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { supabase } from "@/supabase/util/supabase"

export default function UserLogsSummary() {
  const [summary, setSummary] = useState({
    total: 0,
    success: 0,
    blocked: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startOfDay = today.toISOString()

      const { data, error } = await supabase
        .from("login_logs")
        .select("status")
        .gte("login_time", startOfDay)

      if (data) {
        const total = data.length
        const success = data.filter(log => log.status === "success").length
        const blocked = data.filter(log => log.status === "blocked").length

        setSummary({ total, success, blocked })
      } else if (error) {
        console.error("Error fetching summary logs:", error)
      }
      
      setIsLoading(false)
    }

    fetchSummary()
  }, [])

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      <GeneralCard className='grid gap-3'>
          <CardBasedText className="text-gray-500 font-semibold">
            Total Logged in User Today
          </CardBasedText>
          <div className="flex items-center gap-2">
            <span className='summary-data-icon'>
            <Activity className="size-5"/>
            </span>
            <div className="flex w-full items-center justify-between">
            <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : summary.total}</CardHeader>
            <CardBasedText className='text-xs font-semibold summary-data-icon'>Total Logs</CardBasedText>
            </div>
          </div>
      </GeneralCard>
       <GeneralCard className='grid gap-3'>

          <CardBasedText className="text-gray-500 font-semibold">
            Total Success Logged in User Today
          </CardBasedText>
          <div className="flex items-center gap-2">
            <span className='summary-data-icon-green'>
            <BadgeCheck className="size-5"/>
            </span>
            <div className="flex w-full items-center justify-between">
            <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : summary.success}</CardHeader>
            <CardBasedText className='text-xs font-semibold summary-data-icon-green'>Success</CardBasedText>
            </div>
          </div>
      </GeneralCard>
       <GeneralCard className='grid gap-3'>

          <CardBasedText className="text-gray-500 font-semibold">
            Total Blocked Users Today
          </CardBasedText>
          <div className="flex items-center gap-2">
            <span className='summary-data-icon-red'>
            <ShieldBan className="size-5"/>
            </span>
            <div className="flex w-full items-center justify-between">
            <CardHeader>{isLoading ? <div className="w-16"><SingleLineSkeleton /></div> : summary.blocked}</CardHeader>
            <CardBasedText className='text-xs font-semibold summary-data-icon-red'>Blocked</CardBasedText>
            </div>
          </div>
      </GeneralCard>
    </section>
  )
}
