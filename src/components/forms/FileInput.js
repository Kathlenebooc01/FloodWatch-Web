"use client"
import clsx from "clsx"
import { CloudUpload, File, CheckCircle, X } from "lucide-react"
import { useState } from "react"

export default function FileInput({ className, label, subLabel, onChange, ...props }) {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setIsUploading(true)
      setProgress(0)

      // Simulate network upload
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 20) + 15
        if (currentProgress >= 100) {
          currentProgress = 100
          clearInterval(interval)
          setIsUploading(false)
        }
        setProgress(currentProgress)
      }, 400)
    }

    if (onChange) {
      onChange(e)
    }
  }

  const handleRemove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setFile(null)
    setProgress(0)
    setIsUploading(false)
  }

  return (
    <div className={clsx("w-full flex flex-col gap-2", className)}>
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <div className={clsx(
        "relative w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden",
        file ? "border-gray-200 bg-white p-4" : "border-gray-300 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/50 p-10 group cursor-pointer"
      )}>
        
        {/* The hidden input (only clickable if no file) */}
        {!file && (
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileChange}
            {...props} 
          />
        )}

        {!file ? (
          // Default Upload State
          <>
            <div className="text-primary group-hover:scale-110 transition-transform duration-300">
              <CloudUpload className="size-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Drag & drop an image here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {subLabel || "or click to browse files (JPEG, PNG up to 5MB)"}
              </p>
            </div>
          </>
        ) : (
          // Uploading / Uploaded State
          <div className="w-full flex items-center justify-between bg-white z-20 relative">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <File className="size-5" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[150px] sm:max-w-[250px]">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-8 text-right">{progress}%</span>
                </div>
              ) : (
                <CheckCircle className="size-5 text-green-500" />
              )}
              <button 
                onClick={handleRemove}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-md cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
