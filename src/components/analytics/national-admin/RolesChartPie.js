"use client"

import GeneralCard from "@/components/cards/GeneralCard"
import { Label, Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { useMemo, useEffect, useState } from "react"
import RolesChartPieHeader from "./RolesChartPieHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { UserRound, HatGlasses,BinocularsIcon, ShieldUser } from "lucide-react"
import CardHeader from "@/components/cards/CardHeader"
import { supabase } from "@/supabase/util/supabase"
import SquareSkeleton from "@/components/skeleton/SquareSkeleton"

const INITIAL_ROLE_DATA = [
  { role: "Provincial Admin", total: 0, fill: "#3b82f6" },
  { role: "Citizens", total: 0, fill: "#10b981" },
  { role: "Headmaster", total: 0, fill: "#f59e0b" },
  { role: "Frontliners", total: 0, fill: "#6366f1" }
]

export default function RolesChartPie() {
  const [roleData, setRoleData] = useState(INITIAL_ROLE_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRoles() {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')

      if (error) {
        console.error("Error fetching roles:", error)
        setLoading(false)
        return
      }

      if (data) {
        let adminCount = 0
        let citizenCount = 0
        let headmasterCount = 0
        let frontlinerCount = 0

        data.forEach(item => {
          const r = item.role?.toLowerCase() || 'citizen'
          if (r.includes('admin')) adminCount++
          else if (r.includes('headmaster')) headmasterCount++
          else if (r.includes('frontliner') || r.includes('responder')) frontlinerCount++
          else citizenCount++ // defaults to citizen for normal users
        })

        setRoleData([
          { role: "Provincial Admin", total: adminCount, fill: "#3b82f6" },
          { role: "Citizens", total: citizenCount, fill: "#10b981" },
          { role: "Headmaster", total: headmasterCount, fill: "#f59e0b" },
          { role: "Frontliners", total: frontlinerCount, fill: "#6366f1" }
        ])
      }
      setLoading(false)
    }
    fetchRoles()
  }, [])

  const totalUsers = useMemo(() => {
    return roleData.reduce((acc, curr) => acc + curr.total, 0)
  }, [roleData])

  const chartData = totalUsers === 0 
    ? [{ role: "No Data", total: 1, fill: "#6b7280" }] 
    : roleData

  if (loading) {
    return <SquareSkeleton />
  }

  return (
    <GeneralCard>
      <div className="flex flex-col h-full w-full">
        <RolesChartPieHeader/>
        <div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
          {roleData.map((item) => (
            <div key={item.role} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              ></div>
              <span className="text-sm text-gray-300 font-medium">{item.role}</span>
            </div>
          ))}
        </div>
        </div>
        <div className="h-[250px] w-full relative">
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
                  if (name === "No Data") return ["0", "Total Users"]
                  return [value, name]
                }}
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="role"
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
                            {totalUsers.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 22}
                            className="fill-gray-400 text-sm font-medium"
                          >
                            Total Users
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

        {/* Custom Legend */}
        <section className="grid gap-5">
        
        <div className="grid justify-center grid-cols-2 gap-x-2 gap-y-5">
            <div>
                <div className="flex items-start gap-2">
                    <span className="summary-data-icon">
                    <HatGlasses className="size-5"/>
                    </span>
                    <div className="flex-col flex items-center">
                    <CardBasedText className='font-semibold'>Provincial Admin</CardBasedText>
                    <CardHeader className='text-primary'>{roleData[0].total}</CardHeader>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-start gap-2">
                    <span className="summary-data-icon-green">
                    <UserRound className="size-5"/>
                    </span>
                    <div className="flex-col flex items-center">
                    <CardBasedText className='font-semibold'>Citizens</CardBasedText>
                    <CardHeader className='text-green-500'>{roleData[1].total}</CardHeader>
                    </div>
                </div>
            </div>
             <div>
                <div className="flex items-start gap-2">
                    <span className="summary-data-icon-amber">
                    <ShieldUser className="size-5"/>
                    </span>
                    <div className="flex-col flex items-center">
                    <CardBasedText className='font-semibold'>LGU Headmaster</CardBasedText>
                    <CardHeader className='text-amber-500'>{roleData[2].total}</CardHeader>
                    </div>
                </div>
            </div>
             <div>
                <div className="flex items-start gap-2">
                    <span className="summary-data-icon-purple">
                    <BinocularsIcon className="size-5"/>
                    </span>
                    <div className="flex-col flex items-center">
                    <CardBasedText className='font-semibold'>LGU Frontliners</CardBasedText>
                    <CardHeader className='text-purple-500'>{roleData[3].total}</CardHeader>
                    </div>
                </div>
            </div>
        </div>
        </section>
      </div>
      
    </GeneralCard>
  )
}
