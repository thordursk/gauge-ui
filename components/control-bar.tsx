"use client"

import { useState } from "react"

import { LayerPicker } from "@/components/layer-picker"
import { PlayModePicker } from "@/components/play-mode-picker"
import { Slider } from "@/components/ui/slider"
import { stepDecimals } from "@/lib/controls"
import type { GaugeLayer } from "@/lib/gauge-layers"
import type { PlayMode } from "@/lib/gauge-panels"

export type ControlBarProps = {
  layers: GaugeLayer[]
  /** Index of the gauge the panels and the value slider are pointed at. */
  selected: number
  onSelect: (index: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
  value: number
  min: number
  max: number
  step: number
  mode: PlayMode
  onValueChange: (value: number) => void
  onModeChange: (mode: PlayMode) => void
}

/**
 * The one bar under the gauge, a single row: which gauge is being edited on
 * the left, the value it is reading in the dial slider filling the rest. The
 * composition itself is kept a step away, in the layers popover the gauge
 * button opens, so the bar stays narrow however many insets are added.
 *
 * Both pickers are dropdowns, which is what keeps the bar to one line: each
 * is a single button naming what it is on, and the choosing is done in the
 * popover rather than in the bar. On phone widths the slider wraps onto its
 * own full-width row under the pickers so it keeps a usable drag length.
 */
export const ControlBar = ({
  layers,
  selected,
  onSelect,
  onAdd,
  onRemove,
  value,
  min,
  max,
  step,
  mode,
  onValueChange,
  onModeChange,
}: ControlBarProps) => {
  const [draft, setDraft] = useState<string | null>(null)

  const decimals = stepDecimals(step)
  const shown = (Number.isFinite(value) ? value : 0).toFixed(decimals)

  const commit = () => {
    if (draft !== null) {
      const parsed = Number.parseFloat(draft)
      if (Number.isFinite(parsed))
        onValueChange(Math.min(max, Math.max(min, parsed)))
    }
    setDraft(null)
  }

  return (
    <div className="flex w-full max-w-md items-center gap-1 rounded-2xl bg-secondary/80 p-1 text-card-foreground ring ring-foreground/10 backdrop-blur-sm max-sm:flex-wrap">
      <LayerPicker
        layers={layers}
        selected={selected}
        onSelect={onSelect}
        onAdd={onAdd}
        onRemove={onRemove}
        className="min-w-0 shrink-0 justify-start"
      />
      <PlayModePicker
        mode={mode}
        onModeChange={onModeChange}
        className="shrink-0"
      />
      <Slider
        variant="dial"
        className="mr-1 h-6 min-w-0 flex-1 rounded-full max-sm:ml-1 max-sm:basis-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(next) =>
          onValueChange(Array.isArray(next) ? next[0] : next)
        }
        aria-label="Gauge value"
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-end px-2.5">
          {draft === null ? (
            <button
              type="button"
              aria-label="Edit gauge value"
              className="pointer-events-auto shrink-0 cursor-text border-b border-transparent font-mono text-xs text-muted-foreground tabular-nums transition-colors hover:border-muted-foreground/60 hover:text-foreground"
              /* The row underneath is the slider; the readout must not start
                 a drag when all that is wanted is to type. */
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setDraft(shown)}
            >
              {shown}
            </button>
          ) : (
            <input
              autoFocus
              value={draft}
              inputMode="decimal"
              aria-label="Gauge value"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit()
                if (e.key === "Escape") setDraft(null)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto w-14 shrink-0 border-b border-muted-foreground bg-transparent text-right font-mono text-xs tabular-nums outline-none"
            />
          )}
        </div>
      </Slider>
    </div>
  )
}
