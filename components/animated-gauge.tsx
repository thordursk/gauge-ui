"use client"

import { useEffect, useRef, useState } from "react"

import { GaugePreview } from "@/components/gauge-preview"
import { clamp, type GaugeTransition } from "@/components/gauge"
import type { PlayMode } from "@/lib/gauge-panels"
import type { GaugeSpec } from "@/lib/gauge-spec"

export type AnimatedGaugeProps = {
  spec: GaugeSpec
  /** The gauge's own value; an inset's are inside the spec. */
  value: number
  mode: PlayMode
  /** Seconds per sweep leg, or between wander and jump targets. */
  period: number
  /** Wander range as a fraction of the domain, centred on the target. */
  amplitude: number
  /** Brings the whole composition up from the foot of each domain on mount. */
  sweepIn?: boolean
}

/** One gauge under the play mode: the domain it runs in, and where it rests. */
type Driven = { min: number; max: number; target: number }

/** Where a gauge goes on the next leg, reckoned against its own domain. */
const legOf = (
  { min, max, target }: Driven,
  from: number,
  mode: PlayMode,
  amplitude: number
) => {
  const span = max - min
  if (mode === "sweep") return from === max ? min : max
  if (mode === "jump") return min + Math.random() * span
  return clamp(target + (Math.random() * 2 - 1) * amplitude * span, min, max)
}

/**
 * Feeds the preview moving targets. Manual and jump settle with the spec's
 * own transition, so the preview shows exactly what the copied code does.
 * Sweep and wander glide between targets with a tween that lasts one period.
 *
 * Every gauge in the composition is driven, insets along with the host, each
 * in its own domain and around its own resting value. They keep one clock
 * between them, so a sweep runs them together, while jump and wander draw
 * for each of them separately.
 */
export const AnimatedGauge = ({
  spec,
  value,
  mode,
  period,
  amplitude,
  sweepIn = false,
}: AnimatedGaugeProps) => {
  const insets = spec.insets ?? []
  /* The host first and the insets after, which is the order `play` holds. */
  const driven: Driven[] = [
    { min: spec.domain.min, max: spec.domain.max, target: value },
    ...insets.map((inset) => ({
      min: inset.spec.domain.min,
      max: inset.spec.domain.max,
      target: inset.value,
    })),
  ]

  /* Read through a ref so the clock keeps up with a composition being edited
     without having to list it, and start over, on every render. */
  const latest = useRef(driven)
  useEffect(() => {
    latest.current = driven
  })

  const [play, setPlay] = useState<number[]>([])

  useEffect(() => {
    if (mode === "manual") return
    const next = () =>
      setPlay((prev) =>
        latest.current.map((gauge, i) =>
          legOf(gauge, prev[i] ?? gauge.target, mode, amplitude)
        )
      )
    // Start the first leg right away rather than after a full period.
    const first = window.setTimeout(next, 0)
    const id = window.setInterval(next, period * 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [mode, period, amplitude])

  const glide: GaugeTransition = {
    type: "tween",
    duration: period,
    ease: "easeInOut",
  }
  const settles = mode === "manual" || mode === "jump"
  /* A gauge rests where it was put until its first leg has been drawn. */
  const shown = (i: number) =>
    mode === "manual" ? driven[i].target : (play[i] ?? driven[i].target)

  /* An inset carries its own value and transition, so driving one is a matter
     of handing it the moving target in place of the value it was given. */
  const played =
    mode === "manual"
      ? spec
      : {
          ...spec,
          insets: insets.map((inset, i) => ({
            ...inset,
            value: shown(i + 1),
            spec: settles
              ? inset.spec
              : { ...inset.spec, transition: glide as GaugeTransition },
          })),
        }

  return (
    <GaugePreview
      spec={played}
      value={shown(0)}
      transition={settles ? spec.transition : glide}
      sweepIn={sweepIn}
    />
  )
}
