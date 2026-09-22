"use client"

import { useState } from "react"
import NotificationBanner from "@/components/notification/provincial-admin/NotificationBanner"
import NotificationToolbar from "@/components/notification/provincial-admin/NotificationToolbar"
import GeneralCard from "@/components/cards/GeneralCard"

export default function ProvincialNotificationPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState("desc")

  return (
    <GeneralCard className="h-full">
      <div className="grid gap-5">
        <NotificationToolbar 
          onSearch={setSearchTerm} 
          sortOrder={sortOrder} 
          onSortChange={setSortOrder} 
        />
        <NotificationBanner 
          searchTerm={searchTerm} 
          sortOrder={sortOrder} 
        />
      </div>
    </GeneralCard>
  )
}
