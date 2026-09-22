"use client"
import { useState, useEffect } from "react"
import SearchInput from "@/components/forms/SearchInput"
import PrimaryButton from "@/components/button/PrimaryButton"
import SecondaryButton from "@/components/button/SecondaryButton"
import { Trash, Plus } from "lucide-react"

export default function ToolBar({ onAddClick, onDeleteClick, searchTerm = "", onSearchChange }) {
  const [localSearch, setLocalSearch] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onSearchChange) onSearchChange(localSearch)
    }, 500)
    return () => clearTimeout(handler)
  }, [localSearch, onSearchChange])
  return (
    <section className="flex gap-2 items-stretch justify-between">
        <div className="">
            <SearchInput 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search announcements..."
            />
        </div>
        <div className="flex gap-2">
            <SecondaryButton onClick={onDeleteClick} className='p-3 text-red-500'><span className="lg:block hidden">Delete Announcement</span> <Trash className="size-5"/></SecondaryButton>
            <PrimaryButton onClick={onAddClick} className='p-3 flex items-center gap-1'><span className="lg:block hidden">Add Announcement</span> <Plus className="size-5"/></PrimaryButton>
        </div>
    </section>
  )
}
