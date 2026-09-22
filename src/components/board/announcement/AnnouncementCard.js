"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardSkeleton from "@/components/skeleton/CardSkeleton"
import EmptyMessage from "@/components/board/EmptyMessage"
import ToolBar from "./ToolBar"
import AddAnnouncementModal from "./AddAnnouncementModal"
import ViewAnnouncementModal from "./ViewAnnouncementModal"
import DeleteAnnouncementModal from "./DeleteAnnouncementModal"
import WarningDeleteBanner from "./WarningDeleteBanner"
import { User } from "lucide-react"
import PrimaryButton from "@/components/button/PrimaryButton"
import SecondaryButton from "@/components/button/SecondaryButton"
import { Trash } from "lucide-react"
// Fixed tag values map to their banner style + label.
const TAG_META = {
  emergency: { label: "Emergency", className: "tag-banner-danger" },
  updates: { label: "Updates", className: "tag-banner-default" },
}

export default function AnnouncementCard() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewAnnouncement, setViewAnnouncement] = useState(null)
  const [deleteAnnouncement, setDeleteAnnouncement] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [showMultiDelete, setShowMultiDelete] = useState(false)

  const fetchAnnouncements = async () => {
    setLoading(true)
    let query = supabase
      .from("announcement_board")
      .select("id, headline, tags, detailed_message, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })

    if (searchTerm) {
      query = query.ilike("headline", `%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[ANNOUNCEMENT FETCH] failed:", error.message, error)
      setLoading(false)
      return
    }
    setAnnouncements(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [searchTerm])

  const truncateWords = (text, limit) => {
    if (!text) return ""
    const words = text.split(" ")
    return words.length > limit ? words.slice(0, limit).join(" ") + "..." : text
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : ""

  return (
    <section className="grid gap-5 relative">
        <ToolBar 
          onAddClick={() => setIsModalOpen(true)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDeleteClick={() => {
            if (selectedIds.length === 0) {
              setShowWarning(true)
            } else {
              setShowMultiDelete(true)
            }
          }}
        />

        {loading ? (
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-16 flex justify-center">
            <EmptyMessage />
          </div>
        ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
          {announcements.map((item) => {
            const tagMeta = TAG_META[item.tags] || TAG_META.updates
            return (
          <GeneralCard key={item.id} className="grid gap-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <input 
                  type="checkbox"
                  className="w-5 h-5 rounded-lg border-gray-200"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => {
                    setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])
                  }}
                />
                <div className={tagMeta.className}>
                  <CardSubHeader>{tagMeta.label}</CardSubHeader>
                </div>
              </div>
              <CardBasedText className='text-gray-500 font-semibold'>{formatDate(item.created_at)}</CardBasedText>
            </div>
            <div className="grid gap-2">
            <CardSubHeader className='text-primary'>{item.headline}</CardSubHeader>
            <CardBasedText className='text-gray-500'>{truncateWords(item.detailed_message, 20)}</CardBasedText>
            </div>
            <hr className="border-gray-500/20"/>
            <div className="w-full flex gap-2 items-center">
                <div className="p-2 bg-gray-500/10 text-gray-500 rounded-full">
                    <User/>
                </div>
                <CardBasedText>{item.profiles?.full_name || "Unknown"}</CardBasedText>
            </div>
            <div className="flex gap-2 items-center">
              <PrimaryButton className='w-full' onClick={() => setViewAnnouncement(item)}>View Announcement</PrimaryButton>
              <SecondaryButton className='rounded-full p-2' onClick={() => setDeleteAnnouncement(item)}><Trash className="text-red-500 size-5"/></SecondaryButton>
            </div>
          </GeneralCard>
            )
          })}
        </div>
        )}

        {isModalOpen && (
          <AddAnnouncementModal
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { setIsModalOpen(false); fetchAnnouncements() }}
          />
        )}

        {viewAnnouncement && (
          <ViewAnnouncementModal
            announcement={viewAnnouncement}
            onClose={() => setViewAnnouncement(null)}
          />
        )}

        {deleteAnnouncement && (
          <DeleteAnnouncementModal
            announcement={deleteAnnouncement}
            onClose={() => setDeleteAnnouncement(null)}
            onSuccess={() => { setDeleteAnnouncement(null); fetchAnnouncements() }}
          />
        )}

        {showMultiDelete && (
          <DeleteAnnouncementModal
            selectedIds={selectedIds}
            onClose={() => setShowMultiDelete(false)}
            onSuccess={() => { setShowMultiDelete(false); setSelectedIds([]); fetchAnnouncements() }}
          />
        )}

        {showWarning && (
          <WarningDeleteBanner 
            message="Please select at least one announcement to delete." 
            onClose={() => setShowWarning(false)} 
          />
        )}
    </section>
  )
}
