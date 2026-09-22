"use client"
import { useState, useCallback } from "react"
import { supabase } from "@/supabase/util/supabase"
import ToolBar from "@/components/board/news/ToolBar"
import NewsContentCard from "@/components/board/news/NewsContentCard"
import WarningDeleteBanner from "@/components/board/announcement/WarningDeleteBanner"
import NewsViewDeleteModal from "@/components/board/news/NewsViewDeleteModal"

export default function Page() {
  const [selectedIds, setSelectedIds] = useState([])
  const [refreshToken, setRefreshToken] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargets, setDeleteTargets] = useState([])

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const deleteIds = useCallback(async (ids) => {
    if (!ids.length) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("news_board").delete().in("id", ids)
      if (error) {
        console.error("[NEWS DELETE] failed:", error.message, error)
        throw error
      }
      setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)))
      setRefreshToken((n) => n + 1)
    } catch (err) {
      console.error("[NEWS DELETE] aborted:", err?.message, err)
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return (
    <div className="grid gap-5">
      <ToolBar
        selectedCount={selectedIds.length}
        isDeleting={isDeleting}
        onDeleteSelected={() => {
          if (selectedIds.length === 0) {
            setShowWarning(true)
          } else {
            setDeleteTargets(selectedIds)
            setShowDeleteModal(true)
          }
        }}
        onSearch={setSearchTerm}
      />
      <NewsContentCard
        refreshToken={refreshToken}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onDeleteOne={(id) => {
          setDeleteTargets([id])
          setShowDeleteModal(true)
        }}
        searchTerm={searchTerm}
      />

      {showDeleteModal && (
        <NewsViewDeleteModal
          count={deleteTargets.length}
          isDeleting={isDeleting}
          onConfirm={async () => {
            await deleteIds(deleteTargets)
            setShowDeleteModal(false)
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showWarning && (
        <WarningDeleteBanner 
          message="Please select at least one news item to delete."
          onClose={() => setShowWarning(false)}
        />
      )}
    </div>
  )
}
