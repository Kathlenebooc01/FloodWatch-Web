"use client"
import FloatingModal from "@/components/Modal/FloatingModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralCard from "@/components/cards/GeneralCard"
import { X, User, Calendar } from "lucide-react"

export default function ViewAnnouncementModal({ announcement, onClose }) {
  if (!announcement) return null;

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : ""

  return (
    <section>
        <FloatingModal>
            <GeneralCard className='flex flex-col gap-5 p-6 w-full max-w-xl relative'>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="size-6" />
                </button>
                
                <div className="grid gap-3">
                    <CardSubHeader className='text-primary text-2xl pr-8'>{announcement.headline}</CardSubHeader>
                    <div className="flex gap-6 items-center">
                        <div className="flex gap-2 items-center text-gray-500">
                            <User className="size-4" />
                            <CardBasedText className="font-semibold">{announcement.profiles?.full_name || "Unknown"}</CardBasedText>
                        </div>
                        <div className="flex gap-2 items-center text-gray-500">
                            <Calendar className="size-4" />
                            <CardBasedText className="font-semibold">{formatDate(announcement.created_at)}</CardBasedText>
                        </div>
                    </div>
                </div>
                
                <hr className="border-gray-500/20"/>
                
                <div className="min-h-[150px] max-h-[60vh] overflow-y-auto pr-2">
                    <CardBasedText className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {announcement.detailed_message}
                    </CardBasedText>
                </div>
            </GeneralCard>
        </FloatingModal>
    </section>
  )
}
