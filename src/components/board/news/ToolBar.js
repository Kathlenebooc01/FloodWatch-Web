"use client"
import { useState, useEffect } from "react"
import SearchInput from "@/components/forms/SearchInput"
import SecondaryButton from "@/components/button/SecondaryButton"
import PrimaryButton from "@/components/button/PrimaryButton"
import Link from "next/link"
import { Plus, Trash } from "lucide-react"
export default function ToolBar({ selectedCount = 0, isDeleting = false, onDeleteSelected, onSearch }) {
  const [term, setTerm] = useState("")

  // Debounce: only propagate the search term 400ms after typing stops
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch?.(term.trim())
    }, 400)
    return () => clearTimeout(timeout)
  }, [term, onSearch])

  return (
    <section className="">
        <section className="flex gap-2 items-stretch justify-between">
            <SearchInput
              placeholder="Search news"
              className="h-full"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
        <div className="flex gap-2">
            <SecondaryButton
              className='p-3'
              disabled={isDeleting}
              onClick={onDeleteSelected}
            >
                <p className="lg:block hidden text-red-500">Delete News</p>
                <Trash className="size-5 text-red-500"/>
            </SecondaryButton>
            <PrimaryButton className='p-3 flex items-center gap-2'>
                <Link href="/provincial-admin/board/news/news-content" className="lg:block hidden">Add News</Link>
                <Plus/>
            </PrimaryButton>
        </div>
        </section>
    </section>
  )
}
