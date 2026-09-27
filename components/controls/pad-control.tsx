"use client"

import { useRef } from "react"

import { Row } from "@/components/controls/field-controls"
import {
  snapToStep,
  stepDecimals,
  type PadAxis,
  type PadConfig,
  type PadValue,
} from "@/lib/controls"

const DEFAULT_AXIS: PadAxis = [0, -1, 1, 0.01]

export type PadControlProps = {
  label: string
  pad?: PadConfig
  value: PadValue
  onChange: (value: PadValue) => void
}

/**
 * A two-axis position: drag anywhere in the field, or nudge with the arrow
 * keys. Screen Y grows downward while the pad's grows upward, so the vertical
 * axis is flipped on the way in and out.
 */
export const PadControl = ({ label, pad, value, onChange }: PadControlProps) => {
  const [, minX, maxX, stepX = 0.01] = pad?.x ?? DEFAULT_AXIS
  const [, minY, maxY, stepY = 0.01] = pad?.y ?? DEFAULT_AXIS

  const area = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const apply = (clientX: number, clientY: number) => {
    const rect = area.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const tx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const ty = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    onChange({
      x: snapToStep(minX + tx * (maxX - minX), stepX, minX, maxX),
      y: snapToStep(minY + (1 - ty) * (maxY - minY), stepY, minY, maxY),
    })
  }

  const nudge = (dx: number, dy: number) =>
    onChange({
      x: snapToStep(value.x + dx * stepX, stepX, minX, maxX),
      y: snapToStep(value.y + dy * stepY, stepY, minY, maxY),
    })

  const fmt = (v: number, step: number) => v.toFixed(stepDecimals(step))
  /* Where the puck sits, as fractions of the field. */
  const px = (value.x - minX) / (maxX - minX || 1)
  const py = (value.y - minY) / (maxY - minY || 1)

  return (
    <div className="flex flex-col gap-1">
      <Row label={label}>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {fmt(value.x, stepX)}, {fmt(value.y, stepY)}
        </span>
      </Row>
      <div
        ref={area}
        tabIndex={0}
        aria-label={label}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.focus()
          apply(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (dragging.current) apply(e.clientX, e.clientY)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onKeyDown={(e) => {
          const dx =
            e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0
          const dy = e.key === "ArrowDown" ? -1 : e.key === "ArrowUp" ? 1 : 0
          if (!dx && !dy) return
          e.preventDefault()
          nudge(dx, dy)
        }}
        className="relative h-28 w-full cursor-crosshair touch-none overflow-hidden rounded-md bg-input/50 select-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-hidden"
      >
        {/* A dot grid that melts away towards the edges. Odd tile counts on
            both axes put a dot dead centre and a full row and column of dots
            on the crosshair lines, whatever the pad's rendered size. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--foreground) 22%, transparent) 1px, transparent 1px)",
            backgroundSize: "calc(100% / 21) calc(100% / 7)",
            backgroundPosition: "center",
            maskImage:
              "radial-gradient(ellipse 70% 70% at center, black 35%, transparent 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 70% at center, black 35%, transparent 95%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px bg-foreground/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-foreground/10"
        />
        <div
          aria-hidden
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm"
          style={{ left: `${px * 100}%`, top: `${(1 - py) * 100}%` }}
        />
      </div>
    </div>
  )
}
