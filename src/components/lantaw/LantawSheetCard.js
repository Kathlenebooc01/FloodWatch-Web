"use client"
import { useState } from "react"
import { Sheet, Download, Loader2 } from "lucide-react"

export default function LantawSheetCard({ data }) {
  const { title, source } = data
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch('/api/lantaw/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, title }),
      })

      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = (title || source).replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').substring(0, 60)
      a.download = `${safeTitle}_FloodWatch.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Sheet download error:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  // Prettify the source name for display
  const sourceName = source?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="w-full max-w-md my-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-transparent border-b border-gray-100">
        <div className="p-2 bg-green-100 rounded-lg">
          <Sheet className="size-5 text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
          <p className="text-xs text-gray-400">Source: {sourceName}</p>
        </div>
      </div>

      {/* Download button */}
      <div className="p-3 bg-gray-50/50">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download Excel Spreadsheet
        </button>
      </div>
    </div>
  )
}
