"use client"

import { createPortal } from "react-dom"

export default function IndicatorLegendPlacement({ containerId, children }) {
  const target = containerId && typeof document !== "undefined"
    ? document.getElementById(containerId)
    : null

  return target ? createPortal(children, target) : children
}
