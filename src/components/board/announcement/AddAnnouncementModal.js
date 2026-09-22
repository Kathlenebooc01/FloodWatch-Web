"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import FloatingModal from "@/components/Modal/FloatingModal"
import CardSubHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralCard from "@/components/cards/GeneralCard"
import { Megaphone } from "lucide-react"
import GeneralInput from "@/components/forms/GeneralInput"
import TextArea from "@/components/forms/TextArea"
import DropwDown from "@/components/button/DropwDown"
import PrimaryButton from "@/components/button/PrimaryButton"

// Tags are fixed in the database: only "emergency" or "updates" are allowed.
const TAG_OPTIONS = [
  { value: "emergency", label: "Emergency" },
  { value: "updates", label: "Updates" },
]

export default function AddAnnouncementModal({ onClose, onSuccess }) {
  const [headline, setHeadline] = useState("")
  const [tag, setTag] = useState("")
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState(null)
  const [tagOpen, setTagOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUserId(session.user.id)
    }
    getUser()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!headline.trim() || !tag || !message.trim()) return
    if (!userId) {
      console.error("[ANNOUNCEMENT ADD] no user session")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from("announcement_board").insert({
        headline: headline.trim(),
        tags: tag, // "emergency" | "updates"
        detailed_message: message.trim(),
        profile_id: userId,
      })

      if (error) {
        console.error("[ANNOUNCEMENT ADD] failed:", error.message, error)
        throw error
      }

      onSuccess?.()
    } catch (err) {
      console.error("[ANNOUNCEMENT ADD] aborted:", err?.message, err)
      setIsSaving(false)
    }
  }

  const selectedLabel = TAG_OPTIONS.find((o) => o.value === tag)?.label

  return (
    <section>
        <FloatingModal>
            <GeneralCard className='flex flex-col gap-5 p-5 justify-center items-center w-full max-w-md'>
                <div className="rounded-full bg-primary/10 p-5 text-primary">
                    <Megaphone className="size-10"/>
                </div>
                <div className="text-center text-gray-500">
                    <CardSubHeader className='text-center'>Add Announcement</CardSubHeader>
                    <CardBasedText className='text-center'>Fill in the details to add an announcement</CardBasedText>
                </div>
                <form onSubmit={handleSubmit} className="w-full grid gap-4">
                    <fieldset className="grid gap-3">
                        <CardBasedText className='font-semibold'>Header/Title</CardBasedText>
                        <GeneralInput
                          placeholder='put your title here'
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                        />
                    </fieldset>
                    <fieldset className="grid gap-3">
                        <CardBasedText className='font-semibold'>Tags</CardBasedText>
                        <div className="relative">
                          <DropwDown type="button" onClick={() => setTagOpen((o) => !o)} className='w-full'>
                            {selectedLabel || "Select tag"}
                          </DropwDown>
                          {tagOpen && (
                            <div className="absolute z-10 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                              {TAG_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => { setTag(opt.value); setTagOpen(false) }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                    </fieldset>
                    <fieldset className="grid gap-3">
                        <CardBasedText className='font-semibold'>Detailed Message</CardBasedText>
                        <TextArea
                          placeholder='put your content here'
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                    </fieldset>
                    <div className="grid gap-3">
                        <PrimaryButton
                          type="submit"
                          disabled={isSaving || !headline.trim() || !tag || !message.trim()}
                        >
                          {isSaving ? "Adding..." : "Add Announcement"}
                        </PrimaryButton>
                        <button type="button" onClick={onClose} className="text-gray-500"><CardBasedText>Cancel</CardBasedText></button>
                    </div>
                </form>
            </GeneralCard>
        </FloatingModal>
    </section>
  )
}
