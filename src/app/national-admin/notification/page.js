"use client"
import { useState } from "react"
import NotificationBanner from "@/components/notification/national-admin/NotificationBanner"
import NotificationToolbar from "@/components/notification/national-admin/NotificationToolbar"
import GeneralCard from "@/components/cards/GeneralCard"
export default function page() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState("desc")

  return (
    <GeneralCard className="h-full ">
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
