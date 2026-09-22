"use client"
import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import TextArea from "@/components/forms/TextArea"
import PrimaryButton from "@/components/button/PrimaryButton"

export default function NewsPromptAssist({ isOpen, onClose, onGenerate, onGenerateStart, existingFields }) {
  const [narration, setNarration] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!narration.trim()) {
      setError("Please describe the event first.")
      return
    }

    setIsLoading(true)
    setError("")

    // Notify parent to show skeleton loaders
    if (onGenerateStart) onGenerateStart()

    try {
      const res = await fetch("/api/lantaw/news-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          narration: narration.trim(),
          existingFields: existingFields || {},
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      if (data.fields) {
        onGenerate(data.fields)
        setNarration("")
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div 
            className="bg-white/50 backdrop-blur-2xl border border-gray-200 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative transition-all pointer-events-auto"
          >

            {/* Content */}
        <fieldset className="grid gap-4">
          <p className="text-sm text-gray-600">
            Need help writing your news report? Just tell Lantaw what happened in a few words, and it will generate a professional, detailed report for you automatically.
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-all">
            <TextArea 
              className="min-h-[150px] md:min-h-[200px]" 
              placeholder='Example: Heavy rain in Manila caused minor flooding in Taft Avenue. No casualties reported, but traffic is heavy. Rescue teams are on standby.' 
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </fieldset>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <PrimaryButton 
            className="px-6 py-2 flex items-center gap-2 rounded-lg" 
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isLoading ? "Generating..." : "Generate Report"}
          </PrimaryButton>
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
