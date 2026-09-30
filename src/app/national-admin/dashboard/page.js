import React from 'react'
import SummaryData from '@/components/contributors/SummaryData'
import AreaCharts from '@/components/analytics/national-admin/AreaChart'
import SystemStatus from '@/components/analytics/national-admin/SystemStatus'
import PendingVerifications from '@/components/analytics/national-admin/PendingVerifications'
import RecentUsers from '@/components/analytics/national-admin/RecentUsers'

export default function page() {
  return (
    <section className='grid gap-4 w-full pb-6'>
      {/* Top 6 Summary Cards */}
      <SummaryData />
      
      {/* Citizen's Growth Chart */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <AreaCharts />
      </div>
      
      {/* System Status & Service Integrations */}
      <SystemStatus />
      
      {/* Bottom Row: Pending Verifications & Recent Users */}
      <div className='grid lg:grid-cols-2 gap-4 items-stretch'>
        <PendingVerifications />
        <RecentUsers />
      </div>
    </section>
  )
}
