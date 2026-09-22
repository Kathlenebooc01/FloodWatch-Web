"use client"
import { useState, useEffect } from "react"

export default function useTypewriter(text, speed = 15) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText("")
    setIsComplete(false)
  }, [text])

  useEffect(() => {
    if (isComplete) return

    const currentLength = displayedText.length
    if (currentLength >= text.length) {
      setIsComplete(true)
      return
    }

    // Reveal word-by-word for natural pacing
    let nextIndex = text.indexOf(' ', currentLength + 1)
    if (nextIndex === -1) nextIndex = text.length

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, nextIndex))
    }, speed)

    return () => clearTimeout(timer)
  }, [displayedText, text, speed, isComplete])

  return { displayedText, isComplete }
}
