"use client"

import { Row, SelectControl } from "@/components/controls/field-controls"
import { SliderControl } from "@/components/controls/slider-control"
import { SegmentedControl } from "@/components/segmented-control"
import type { EasingConfig, TransitionConfig } from "@/lib/controls"

const MODES = [
  { value: "spring", label: "Spring" },
  { value: "easing", label: "Ease" },
] as const

const DEFAULT_EASE: EasingConfig["ease"] = [0.25, 0.1, 0.25, 1]

const EASES: { value: string; label: string; ease: EasingConfig["ease"] }[] = [
  { value: "ease", label: "Ease", ease: DEFAULT_EASE },
  { value: "ease-in", label: "Ease in", ease: [0.42, 0, 1, 1] },
  { value: "ease-out", label: "Ease out", ease: [0, 0, 0.58, 1] },
  { value: "ease-in-out", label: "Ease in-out", ease: [0.42, 0, 0.58, 1] },
  { value: "linear", label: "Linear", ease: [0, 0, 1, 1] },
]

const matchEase = (ease: EasingConfig["ease"]) =>
  EASES.find((entry) => entry.ease.every((n, i) => Math.abs(n - ease[i]) < 1e-3))
    ?.value ?? "ease"

export type TransitionControlProps = {
  label: string
  value: TransitionConfig
  onChange: (value: TransitionConfig) => void
}

/**
 * How the gauge settles on a new value: a spring said in duration and bounce,
 * or a bezier easing over a duration. Switching modes carries the duration
 * across, so trying both stays a fair comparison.
 */
export const TransitionControl = ({
  label,
  value,
  onChange,
}: TransitionControlProps) => {
  const setMode = (mode: (typeof MODES)[number]["value"]) => {
    if (mode === value.type) return
    if (mode === "spring") {
      const duration = value.type === "easing" ? value.duration : 0.5
      onChange({ type: "spring", visualDuration: duration, bounce: 0.1 })
    } else {
      const duration =
        value.type === "spring" ? (value.visualDuration ?? 0.5) : 0.5
      onChange({ type: "easing", duration, ease: DEFAULT_EASE })
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Row label={label}>
        <SegmentedControl
          options={MODES}
          value={value.type}
          onValueChange={setMode}
          aria-label={`${label} type`}
          /* The row is already the container, so the strip stays bare and
             only the sliding pill marks the active mode. */
          className="-mr-1.5 h-7 shrink-0 items-center bg-transparent p-0.5"
          itemClassName="px-2 py-1 text-xs"
        />
      </Row>
      {value.type === "spring" ? (
        <>
          <SliderControl
            label="Duration"
            value={value.visualDuration ?? 0.5}
            min={0.1}
            max={2}
            step={0.05}
            onChange={(visualDuration) =>
              onChange({ ...value, visualDuration })
            }
          />
          <SliderControl
            label="Bounce"
            value={value.bounce ?? 0}
            min={0}
            max={1}
            step={0.01}
            onChange={(bounce) => onChange({ ...value, bounce })}
          />
        </>
      ) : (
        <>
          <SliderControl
            label="Duration"
            value={value.duration}
            min={0.1}
            max={3}
            step={0.05}
            onChange={(duration) => onChange({ ...value, duration })}
          />
          <SelectControl
            label="Curve"
            options={EASES.map(({ value: v, label: l }) => ({
              value: v,
              label: l,
            }))}
            value={matchEase(value.ease)}
            onChange={(name) => {
              const preset = EASES.find((entry) => entry.value === name)
              if (preset) onChange({ ...value, ease: preset.ease })
            }}
          />
        </>
      )}
    </div>
  )
}
