"use client"
import AreaChartHeader from "./AreaChartHeader"
import GeneralCard from "@/components/cards/GeneralCard"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { supabase } from "@/supabase/util/supabase"
import SquareSkeleton from "@/components/skeleton/SquareSkeleton"

const INITIAL_DATA = [
  { month: "Jan", accounts: 0 },
  { month: "Feb", accounts: 0 },
  { month: "Mar", accounts: 0 },
  { month: "Apr", accounts: 0 },
  { month: "May", accounts: 0 }, 
  { month: "Jun", accounts: 0 },
  { month: "Jul", accounts: 0 },
  { month: "Aug", accounts: 0 },
  { month: "Sep", accounts: 0 },
  { month: "Oct", accounts: 0 },
  { month: "Nov", accounts: 0 },
  { month: "Dec", accounts: 0 },
]

export default function AreaCharts() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [availableYears, setAvailableYears] = useState([])
  const [data, setData] = useState(INITIAL_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAvailableYears() {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .not('created_at', 'is', null)

      if (error) {
        console.error("Error fetching years:", error)
        setAvailableYears([currentYear])
        return
      }

      const uniqueYears = new Set()
      if (data) {
        data.forEach(profile => {
          if (profile.created_at) {
            uniqueYears.add(new Date(profile.created_at).getFullYear())
          }
        })
      }

      const yearsArray = Array.from(uniqueYears).sort((a, b) => b - a)
      
      if (yearsArray.length === 0) {
        yearsArray.push(currentYear)
      }

      setAvailableYears(yearsArray)
    }
    fetchAvailableYears()
  }, [])

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', `${selectedYear}-01-01T00:00:00.000Z`)
        .lt('created_at', `${selectedYear + 1}-01-01T00:00:00.000Z`)
        
      if (error) {
        console.error("Error fetching profiles:", error)
        setLoading(false)
        return
      }

      if (profiles) {
        const counts = Array(12).fill(0)
        profiles.forEach(profile => {
          if (profile.created_at) {
            const date = new Date(profile.created_at)
            counts[date.getMonth()] += 1
          }
        })

        setData([
          { month: "Jan", accounts: counts[0] },
          { month: "Feb", accounts: counts[1] },
          { month: "Mar", accounts: counts[2] },
          { month: "Apr", accounts: counts[3] },
          { month: "May", accounts: counts[4] }, 
          { month: "Jun", accounts: counts[5] },
          { month: "Jul", accounts: counts[6] },
          { month: "Aug", accounts: counts[7] },
          { month: "Sep", accounts: counts[8] },
          { month: "Oct", accounts: counts[9] },
          { month: "Nov", accounts: counts[10] },
          { month: "Dec", accounts: counts[11] },
        ])
      }
      setLoading(false)
    }

    fetchProfiles()
  }, [selectedYear])

  if (loading) {
    return <SquareSkeleton />
  }

  return (
    <GeneralCard>
        <div className="flex flex-col h-full w-full">
            <AreaChartHeader 
              selectedYear={selectedYear} 
              setSelectedYear={setSelectedYear} 
              availableYears={availableYears} 
            />
            <div className="h-[300px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.5} />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#111827', 
                                borderColor: '#374151', 
                                borderRadius: '8px', 
                                color: '#f9fafb',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                            cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="accounts" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorAccounts)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </GeneralCard>
  )
}

