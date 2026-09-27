"use client"

import { useState } from "react"

import { Slider } from "@/components/ui/slider"
import { stepDecimals } from "@/lib/controls"

export type SliderControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

/**
 * The panel slider: the whole row drags, the label sits inside it on the
 * left and the value on the right. Clicking the value swaps it for an input,
 * for the numbers a drag will not land on exactly.
 */
export const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: SliderControlProps) => {
  const [draft, setDraft] = useState<string | null>(null)

  const decimals = stepDecimals(step)
  const shown = (Number.isFinite(value) ? value : 0).toFixed(decimals)

  const commit = () => {
    if (draft !== null) {
      const parsed = Number.parseFloat(draft)
      if (Number.isFinite(parsed))
        onChange(Math.min(max, Math.max(min, parsed)))
    }
    setDraft(null)
  }

  return (
    <Slider
      variant="dial"
      min={min}
      max={max}
      step={step}
      value={Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))}
      onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      aria-label={label}
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between gap-2 px-2.5">
        <span className="truncate text-[13px] font-medium text-foreground/80">
          {label}
        </span>
        {draft === null ? (
          <button
            type="button"
            aria-label={`Edit ${label}`}
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
            aria-label={label}
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
  )
}
