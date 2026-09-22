"use client"
import { useState } from "react"
import { supabase } from "@/supabase/util/supabase"
import FloatingModal from "@/components/Modal/FloatingModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralCard from "@/components/cards/GeneralCard"
import { AlertTriangle } from "lucide-react"

export default function DeleteAnnouncementModal({ announcement, selectedIds, onClose, onSuccess }) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!announcement && (!selectedIds || selectedIds.length === 0)) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    
    if (selectedIds && selectedIds.length > 0) {
      const { error } = await supabase
        .from("announcement_board")
        .delete()
        .in("id", selectedIds)
      if (error) console.error("[MULTI DELETE] failed:", error.message)
    } else if (announcement) {
      const { error } = await supabase
        .from("announcement_board")
        .delete()
        .eq("id", announcement.id)
      if (error) console.error("[SINGLE DELETE] failed:", error.message)
    }
    
    onSuccess?.()
  }

  const title = selectedIds ? `Delete ${selectedIds.length} Announcements` : "Delete Announcement"
  const message = selectedIds 
    ? `Are you sure you want to delete ${selectedIds.length} selected announcements? This action cannot be undone.`
    : `Are you sure you want to delete "${announcement?.headline}"? This action cannot be undone.`

  return (
    <section>
        <FloatingModal>
            <GeneralCard className='flex flex-col gap-6 p-6 items-center w-full lg:max-w-lg  max-w-sm text-center'>
                <div className="rounded-full bg-red-500/10 p-5 text-red-500">
                    <AlertTriangle className="size-10"/>
                </div>
                <div>
                    <CardSubHeader>{title}</CardSubHeader>
                    <CardBasedText className='mt-2 text-gray-500'>
                        {selectedIds ? message : (
                          <>Are you sure you want to delete <span className="font-semibold text-gray-700">"{announcement?.headline}"</span>? This action cannot be undone.</>
                        )}
                    </CardBasedText>
                </div>
                <div className="flex gap-3 w-full mt-4">
                    <button
                      onClick={onClose} 
                      className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-semibold"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="w-full py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-semibold flex justify-center items-center"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </GeneralCard>
        </FloatingModal>
    </section>
  )
}
