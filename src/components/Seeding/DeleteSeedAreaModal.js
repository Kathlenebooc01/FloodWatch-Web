import FloatingModal from "@/components/Modal/FloatingModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralCard from "@/components/cards/GeneralCard"
import { CircleAlert, Loader2 } from "lucide-react"

export default function DeleteSeedAreaModal({ areaName, onCancel, onConfirm, isDeleting }) {
  return (
    <FloatingModal>
      <GeneralCard className='flex flex-col justify-center items-center gap-4 p-6 max-w-sm w-full mx-auto shadow-2xl border border-gray-100'>
        <CircleAlert className="size-14 bg-red-50 text-red-500 rounded-full p-2.5 shrink-0" />
        <div className="text-center flex flex-col items-center gap-1">
          <CardSubHeader className="text-base text-gray-800">Delete Area Record</CardSubHeader>
          <CardBasedText className="text-xs text-gray-500 leading-relaxed">
            Are you sure you want to delete <strong className="text-gray-800">{areaName}</strong> from the database? This action cannot be undone.
          </CardBasedText>
        </div>
        <div className="flex gap-3 w-full justify-center mt-2">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-xs font-semibold text-gray-600 py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="danger-button flex items-center gap-2 text-xs px-4 py-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin"/>}
            {isDeleting ? "Deleting..." : "Yes, Delete Record"}
          </button>
        </div>
      </GeneralCard>
    </FloatingModal>
  )
}
