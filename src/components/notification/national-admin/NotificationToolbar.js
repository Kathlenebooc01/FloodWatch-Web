"use client"
import { useState, useRef } from "react"
import SearchInput from "@/components/forms/SearchInput"
import DropwDown from "@/components/button/DropwDown"
import { Check } from "lucide-react"

export default function NotificationToolbar({ onSearch, sortOrder, onSortChange }) {
  const [localSearch, setLocalSearch] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debounceTimerRef = useRef(null)

  const handleSearchChange = (e) => {
    const value = e.target.value
    setLocalSearch(value)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (onSearch) onSearch(value)
    }, 500)
  }

  return (
    <section className="flex items-center gap-3 justify-between">
      <SearchInput 
        placeholder="Search notifications" 
        value={localSearch}
        onChange={handleSearchChange}
      />
      
      <div className="relative">
        <DropwDown onClick={() => setDropdownOpen(!dropdownOpen)}>
          Sort By: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
        </DropwDown>
        
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-2xl border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  if (onSortChange) onSortChange('desc')
                  setDropdownOpen(false)
                }}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer ${sortOrder === 'desc' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Newest (Desc)
                {sortOrder === 'desc' && <Check className="size-4" />}
              </button>
              <button
                onClick={() => {
                  if (onSortChange) onSortChange('asc')
                  setDropdownOpen(false)
                }}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer ${sortOrder === 'asc' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Oldest (Asc)
                {sortOrder === 'asc' && <Check className="size-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
