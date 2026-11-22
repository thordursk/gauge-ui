"use client"

import { useEffect, useRef, useState } from "react"

import { GaugePreview } from "@/components/gauge-preview"
import { clamp, type GaugeTransition } from "@/components/gauge"
import type { PlayMode } from "@/lib/gauge-panels"
import type { GaugeSpec } from "@/lib/gauge-spec"

export type AnimatedGaugeProps = {
  spec: GaugeSpec
  value: number
  mode: PlayMode
  period: number
  amplitude: number
  sweepIn?: boolean
}

type Driven = { min: number; max: number; target: number }

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

export const AnimatedGauge = ({
  spec,
  value,
  mode,
  period,
  amplitude,
  sweepIn = false,
}: AnimatedGaugeProps) => {
  const insets = spec.insets ?? []
  const driven: Driven[] = [
    { min: spec.domain.min, max: spec.domain.max, target: value },
    ...insets.map((inset) => ({
      min: inset.spec.domain.min,
      max: inset.spec.domain.max,
      target: inset.value,
    })),
  ]

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
  const shown = (i: number) =>
    mode === "manual" ? driven[i].target : (play[i] ?? driven[i].target)

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
