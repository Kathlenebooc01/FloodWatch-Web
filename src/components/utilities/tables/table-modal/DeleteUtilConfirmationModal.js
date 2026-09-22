import { CircleAlert, Loader2 } from "lucide-react"
import FloatingModal from "@/components/Modal/FloatingModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralCard from "@/components/cards/GeneralCard"

export default function DeleteUtilConfirmationModal({ onCancel, onConfirm, isDeleting }) {
  return (
    <FloatingModal>
        <GeneralCard className='flex flex-col justify-center items-center gap-5'>
            <CircleAlert className="size-12 bg-red-500/10 text-red-500 font-semibold rounded-full p-2"/>
            <div className="text-center flex flex-col items-center">
                <CardSubHeader>Remove Equipment</CardSubHeader>
                <CardBasedText>Are you sure you want to remove this equipment?</CardBasedText>
            </div>
            <div className="flex gap-2 w-full justify-center mt-2">
                <button 
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="text-sm text-gray-500 py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="danger-button flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting && <Loader2 className="size-4 animate-spin"/>}
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
            </div>
        </GeneralCard>
    </FloatingModal>
  )
}
