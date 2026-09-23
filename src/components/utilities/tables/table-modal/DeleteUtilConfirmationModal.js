import { Trash2, Loader2 } from "lucide-react"
import FloatingModal from "@/components/Modal/FloatingModal"

export default function DeleteUtilConfirmationModal({ onCancel, onConfirm, isDeleting }) {
  return (
    <FloatingModal>
      <div className="bg-white rounded-[24px] p-6 sm:p-8 max-w-sm w-full mx-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center relative overflow-hidden">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-red-50/80 to-transparent -z-10 pointer-events-none"></div>

        {/* Icon Container with pulsing and scaling effects */}
        <div className="relative mb-7 mt-2 group">
          <div className="absolute inset-0 bg-red-100 rounded-full scale-[1.6] opacity-40 group-hover:scale-[1.8] transition-transform duration-500 ease-out"></div>
          <div className="absolute inset-0 bg-red-50 rounded-full scale-[2.2] opacity-30 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-red-100 to-red-50 text-red-600 p-4 rounded-full shadow-sm ring-4 ring-white/50">
            <Trash2 className="size-8" strokeWidth={2} />
          </div>
        </div>

        {/* Text content */}
        <div className="text-center mb-8 px-2">
          <h3 className="text-xl font-black text-gray-900 mb-2.5 tracking-tight">Remove Equipment?</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            This action cannot be undone. Are you sure you want to permanently delete this utility from the inventory?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20 border border-red-600 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 group"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-5 animate-spin"/>
                Deleting...
              </>
            ) : (
              "Yes, delete it"
            )}
          </button>
        </div>
      </div>
    </FloatingModal>
  )
}
