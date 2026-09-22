"use client"
import { useState } from "react"
import { FileText, Download, Loader2, FileDown } from "lucide-react"

export default function LantawDocumentCard({ data }) {
  const { title, content, format } = data
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState(format || 'pdf')

  const handleDownload = async (fmt) => {
    setIsDownloading(true)
    try {
      const res = await fetch('/api/lantaw/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          format: fmt,
        }),
      })

      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').substring(0, 60)
      a.download = `${safeTitle}_Lantaw.${fmt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Document download error:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="w-full max-w-md my-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
          <p className="text-xs text-gray-400">Document ready for download</p>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex items-center gap-2 p-3 bg-gray-50/50">
        <button
          onClick={() => handleDownload('pdf')}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {isDownloading && selectedFormat === 'pdf' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Download PDF
        </button>
        <button
          onClick={() => { setSelectedFormat('docx'); handleDownload('docx') }}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {isDownloading && selectedFormat === 'docx' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download DOCX
        </button>
      </div>
    </div>
  )
}
