import { useEffect } from "react"
import BannerModal from "@/components/Modal/BannerModal"
import CardBasedText from "@/components/cards/CardBasedText"
import { X, AlertCircle } from "lucide-react"

export default function WarningDeleteBanner({ onClose }) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(() => onClose(), 3000)
      return () => clearTimeout(timer)
    }
  }, [onClose])

  return (
    <BannerModal>
      <div className="flex justify-between items-center p-4 rounded-lg text-red-600">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5" />
          <CardBasedText className="font-semibold">Please select at least one item to delete.</CardBasedText>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:text-red-800 transition">
            <X className="size-5" />
          </button>
        )}
      </div>
    </BannerModal>
  )
}
