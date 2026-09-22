"use client"
import { useState } from "react"
import { X } from "lucide-react"

export default function TagsInput({ className, value, onChange, placeholder, maxTags, disabled, ...props }) {
  const [inputValue, setInputValue] = useState("")
  
  // Ensure we always work with an array
  const tags = Array.isArray(value) ? value : (value ? value.split(',').map(t => t.trim()).filter(Boolean) : [])

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      const newTag = inputValue.trim()
      if (newTag && !tags.includes(newTag)) {
        if (maxTags !== undefined && tags.length >= maxTags) return
        onChange([...tags, newTag])
      }
      setInputValue("")
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className={`input-layout transition-all duration-200 flex flex-wrap gap-2 items-center min-h-[42px] ${className || ""}`}>
      {tags.map((tag, index) => (
        <span key={index} className="tag-default flex items-center gap-1">
          {tag}
          <button 
            type="button" 
            onClick={() => removeTag(index)}
            className="hover:bg-black/10 rounded-full p-0.5 transition-colors cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input 
        {...props}
        className="outline-0 bg-transparent text-sm border-0 flex-1 min-w-[80px] disabled:opacity-50"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        disabled={disabled || (maxTags !== undefined && tags.length >= maxTags)}
      />
    </div>
  )
}
