"use client"
import { useState } from "react"
import GeneralInput from "../forms/GeneralInput"
import { SendHorizonal, Loader2 } from "lucide-react"

export default function InputPrompt({ onSend, isLoading }) {
  const [input, setInput] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput("")
  }

  return (
    <form className="text-xs" onSubmit={handleSubmit}>
        <GeneralInput className='h-20'
            placeholder='Put your prompt here'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            iconRight={
                <button type="submit" disabled={isLoading || !input.trim()} className="modal-icon-button hover:text-primary transition-colors disabled:opacity-40">
                    {isLoading ? <Loader2 className="size-5 animate-spin"/> : <SendHorizonal className="size-5"/>}
                </button>
            }
        />
    </form>
  )
}

