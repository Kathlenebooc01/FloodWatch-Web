"use client"
import { useState, useEffect, useCallback } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import DropwDown from '@/components/button/DropwDown'
import { supabase } from "@/supabase/util/supabase"
import { format, getDaysInMonth } from "date-fns"

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function UtilitiesAreaChartTracker() {
  const currentMonthName = format(new Date(), 'MMMM')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [chartData, setChartData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchChartData = useCallback(async () => {
    setIsLoading(true)
    try {
      const monthIndex = MONTHS.indexOf(selectedMonth)
      const year = new Date().getFullYear()

      // Dates for selected month
      const monthStart = new Date(year, monthIndex, 1, 0, 0, 0)
      const daysInMonth = getDaysInMonth(monthStart)
      const monthEnd = new Date(year, monthIndex, daysInMonth, 23, 59, 59)

      // Fetch all utilities created up to end of selected month
      const { data: utilitiesData } = await supabase
        .from('utilities')
        .select('created_at, quantity')
        .lte('created_at', monthEnd.toISOString())

      // Fetch all resource_requests created up to end of selected month
      const { data: requestsData } = await supabase
        .from('resource_requests')
        .select('created_at, status')
        .lte('created_at', monthEnd.toISOString())

      const utilitiesList = utilitiesData || []
      const requestsList = requestsData || []

      // Generate 7 interval points throughout the month (e.g. 1st, 5th, 10th, 15th, 20th, 25th, last day)
      const intervals = [1, 5, 10, 15, 20, 25, daysInMonth]
      
      const computedData = intervals.map((day) => {
        const intervalCutoff = new Date(year, monthIndex, day, 23, 59, 59)
        const dateLabel = format(new Date(year, monthIndex, day), 'MMM d')

        // Cumulative sum of utility quantities up to this interval date
        const totalUtilities = utilitiesList
          .filter(u => new Date(u.created_at) <= intervalCutoff)
          .reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)

        // Count of requests up to this interval date
        const totalRequests = requestsList
          .filter(r => new Date(r.created_at) <= intervalCutoff)
          .length

        return {
          date: dateLabel,
          utilities: totalUtilities,
          request: totalRequests
        }
      })

      setChartData(computedData)
    } catch (err) {
      console.error("Error fetching chart data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchChartData()

    // Realtime subscriptions for auto-update
    const utilitiesChannel = supabase
      .channel('chart-utilities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utilities' }, fetchChartData)
      .subscribe()

    const requestsChannel = supabase
      .channel('chart-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, fetchChartData)
      .subscribe()

    return () => {
      supabase.removeChannel(utilitiesChannel)
      supabase.removeChannel(requestsChannel)
    }
  }, [fetchChartData])

  return (
    <GeneralCard className="w-full h-[450px] flex flex-col gap-5 p-6 border border-gray-200 bg-white">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <CardHeader>Utilities & Requests Tracker</CardHeader>
          <CardBasedText className="text-gray-500">
            Overview of total utilities and requests for {selectedMonth}
          </CardBasedText>
        </div>
        <div className="relative">
          <DropwDown type="button" onClick={() => setDropdownOpen((o) => !o)}>
            {selectedMonth}
          </DropwDown>
          {dropdownOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
              {MONTHS.map((month) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => { 
                    setSelectedMonth(month) 
                    setDropdownOpen(false) 
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedMonth === month 
                      ? 'bg-primary/10 text-primary font-bold' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 w-full h-full min-h-[300px] transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUtilities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0035A9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0035A9" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRequest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#6b7280', fontSize: 12}} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#6b7280', fontSize: 12}} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{ color: '#374151', fontWeight: 700, marginBottom: '4px' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              wrapperStyle={{ fontSize: '14px', paddingBottom: '20px' }} 
              iconType="circle" 
            />
            <Area 
              type="monotone" 
              dataKey="utilities" 
              stroke="#0035A9" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorUtilities)" 
              name="Total Utilities"
              activeDot={{ r: 6, fill: '#0035A9', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="request" 
              stroke="#f59e0b" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRequest)" 
              name="Total Requests"
              activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GeneralCard>
  )
}
