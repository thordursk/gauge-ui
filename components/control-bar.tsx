"use client"

import { LayerPicker } from "@/components/layer-picker"
import { PlayModePicker } from "@/components/play-mode-picker"
import { Slider } from "@/components/ui/slider"
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
 * The one bar under the gauge: which gauge is being edited along the top,
 * the value it is reading along the bottom. The composition itself is kept a
 * step away, in the layers popover the gauge button opens, so the bar stays
 * narrow however many insets are added.
 *
 * Both of the top row's controls are dropdowns, which is what keeps the row
 * to one line at any width: each is a single button naming what it is on,
 * and the choosing is done in the popover rather than in the bar.
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
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))

  return (
    <div className="flex w-full max-w-md flex-col gap-1 rounded-2xl bg-secondary/80 p-1.5 text-card-foreground ring ring-foreground/10 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <LayerPicker
          layers={layers}
          selected={selected}
          onSelect={onSelect}
          onAdd={onAdd}
          onRemove={onRemove}
          className="min-w-0 justify-start"
        />
        <PlayModePicker
          mode={mode}
          onModeChange={onModeChange}
          className="shrink-0"
        />
        <div className="mt-auto mr-2 ml-auto shrink-0 font-rounded text-base font-semibold text-muted-foreground tabular-nums">
          {value.toFixed(decimals)}
        </div>
      </div>
      <div className="flex items-center gap-3 px-2 pb-0.5">
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={(next) =>
            onValueChange(Array.isArray(next) ? next[0] : next)
          }
          aria-label="Gauge value"
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  )
}
