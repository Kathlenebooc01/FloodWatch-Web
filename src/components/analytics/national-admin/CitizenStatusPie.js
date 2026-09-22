"use client"

import GeneralCard from "@/components/cards/GeneralCard"
import { Label, Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { useMemo, useEffect, useState } from "react"
import CitizenStatusPieHeader from "./CitizenStatusPieHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import CardHeader from "@/components/cards/CardHeader"
import { supabase } from "@/supabase/util/supabase"
import SquareSkeleton from "@/components/skeleton/SquareSkeleton"

const INITIAL_STATUS_DATA = [
  { status: "Verified", total: 0, fill: "#10b981" },
  { status: "Pending", total: 0, fill: "#f59e0b" },
  { status: "Unverified", total: 0, fill: "#ef4444" }
]

export default function CitizenStatusPie() {
  const [statusData, setStatusData] = useState(INITIAL_STATUS_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVerificationStatus() {
      setLoading(true)
      const { data, error } = await supabase
        .from('id_verification')
        .select('status')
        
      if (error) {
        console.error("Error fetching verification statuses:", error)
        setLoading(false)
        return
      }
      
      if (data) {
        let verifiedCount = 0
        let pendingCount = 0
        let unverifiedCount = 0
        
        data.forEach(item => {
          const s = item.status?.toLowerCase() || 'unverified'
          if (s === 'verified' || s === 'approved') verifiedCount++
          else if (s === 'pending') pendingCount++
          else unverifiedCount++
        })
        
        setStatusData([
          { status: "Verified", total: verifiedCount, fill: "#10b981" },
          { status: "Pending", total: pendingCount, fill: "#f59e0b" },
          { status: "Unverified", total: unverifiedCount, fill: "#ef4444" }
        ])
      }
      setLoading(false)
    }
    fetchVerificationStatus()
  }, [])

  const totalCitizens = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + curr.total, 0)
  }, [statusData])

  // If there's no data, render a single gray slice so the pie doesn't disappear
  const chartData = totalCitizens === 0 
    ? [{ status: "No Data", total: 1, fill: "#6b7280" }] 
    : statusData

  if (loading) {
    return <SquareSkeleton />
  }

  return (
    <GeneralCard>
      <div className="flex flex-col h-full w-full">
        <CitizenStatusPieHeader hasPending={statusData[1].total > 0} />
        
        <div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.fill }}
                ></div>
                <span className="text-sm text-gray-300 font-medium">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[250px] w-full relative mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  borderColor: '#374151', 
                  borderRadius: '8px', 
                  color: '#f9fafb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                itemStyle={{ color: '#f9fafb', fontWeight: 500 }}
                formatter={(value, name) => {
                  if (name === "No Data") return ["0", "Total"]
                  return [value, name]
                }}
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="status"
                innerRadius={65}
                outerRadius={100}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy - 5}
                            className=" text-3xl font-bold"
                          >
                            {totalCitizens.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 22}
                            className="fill-gray-400 text-sm font-medium"
                          >
                            Total Citizens
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Summary Statistics */}
        <section className="grid gap-5 mt-6">
          <div className="grid justify-center grid-cols-3 gap-x-2 gap-y-5">
            <div>
              <div className="flex w-full items-start gap-2">
                <span className="summary-data-icon-green flex items-center justify-center rounded-lg bg-green-500/10 p-2">
                  <CheckCircle2 className="size-5 text-green-500"/>
                </span>
                <div className="flex-col flex items-center">
                  <CardBasedText className='font-semibold'>Verified</CardBasedText>
                  <CardHeader className='text-green-500'>{statusData[0].total}</CardHeader>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex w-full items-start gap-2">
                <span className="summary-data-icon-amber flex items-center justify-center rounded-lg bg-amber-500/10 p-2">
                  <Clock className="size-5 text-amber-500"/>
                </span>
                <div className="flex-col flex items-center">
                  <CardBasedText className='font-semibold'>Pending</CardBasedText>
                  <CardHeader className='text-amber-500'>{statusData[1].total}</CardHeader>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-2">
                <span className="summary-data-icon flex items-center justify-center rounded-lg bg-red-500/10 p-2">
                  <XCircle className="size-5 text-red-500"/>
                </span>
                <div className="flex-col flex items-center">
                  <CardBasedText className='font-semibold'>Unverified</CardBasedText>
                  <CardHeader className='text-red-500'>{statusData[2].total}</CardHeader>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </GeneralCard>
  )
}
