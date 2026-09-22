import FloatingModal from "@/components/Modal/FloatingModal"
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import SecondaryButton from "@/components/button/SecondaryButton"
import { Trash } from "lucide-react"

export default function NewsViewDeleteModal({ count = 1, onConfirm, onCancel, isDeleting = false }) {
  const title = count > 1 ? `Delete ${count} News Items` : "Delete News"
  const message = count > 1 
    ? `Are you sure you want to delete ${count} selected news items? This action cannot be undone.`
    : `Are you sure you want to delete this news? This action cannot be undone.`

  return (
    <FloatingModal>
      <GeneralCard className="w-full max-w-md grid gap-6 p-6 text-center">
        <div className="grid gap-3 justify-items-center">
          <span className="inline-flex items-center justify-center size-12 rounded-full bg-red-500/10">
            <Trash className="size-6 text-red-500" />
          </span>
          <CardHeader>{title}</CardHeader>
          <CardBasedText className="text-gray-500">
            {message}
          </CardBasedText>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton className="w-full" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </SecondaryButton>
          <SecondaryButton
            className="w-full text-red-500 font-semibold border-red-500 bg-red-500/5"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </SecondaryButton>
        </div>
      </GeneralCard>
    </FloatingModal>
  )
}
