"use client"

import { useState, useRef, useEffect } from "react"
import SingleLineSkeleton from "../skeleton/SingleLineSkeleton"

export default function HistoryLazyItem({ item }) {
  const [state, setState] = useState("hidden")
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("loading")
          observer.disconnect()
        }
      },
      { rootMargin: "100px" }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (state !== "loading") return
    const timer = setTimeout(() => setState("loaded"), 300)
    return () => clearTimeout(timer)
  }, [state])

  const date = new Date(item.added_on)
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <div ref={ref} className="p-3" style={state === "hidden" ? { visibility: "hidden", height: "64px" } : undefined}>
      {state === "hidden" ? (
         <div style={{ display: "none" }} />
      ) : state === "loading" ? (
         <div className="flex items-center h-full">
            <SingleLineSkeleton />
         </div>
      ) : (
         <div className="flex justify-between items-center h-full">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-gray-800">{item.municipality_or_city?.name || "Unknown Municipality"}</span>
              <span className="text-xs text-gray-500">Telemetry Data Synced</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-medium text-gray-700">{formattedDate}</span>
              <span className="text-xs text-gray-400">{formattedTime}</span>
            </div>
         </div>
      )}
    </div>
  )
}