"use client"
import { useState, useEffect } from "react"

/**
 * Custom hook that tracks whether a DOM element is visible in the viewport
 * using the Intersection Observer API.
 * 
 * @param {React.RefObject} ref - The ref attached to the element to observe.
 * @param {Object} options - IntersectionObserver options (root, rootMargin, threshold).
 * @returns {boolean} - Whether the element is currently intersecting the viewport.
 */
export default function useOnScreen(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0, ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, options.rootMargin, options.threshold])

  return isIntersecting
}
