"use client"

import { useEffect, useEffectEvent, useState } from "react"

import { GaugePreview } from "@/components/gauge-preview"
import { clamp, type GaugeTransition } from "@/components/gauge"
import type { PlayMode } from "@/lib/gauge-panels"
import type { GaugeSpec, BaseGaugeSpec } from "@/lib/gauge-spec"

export type AnimatedGaugeProps = {
  spec: GaugeSpec
  value: number
  mode: PlayMode
  period: number
  amplitude: number
  playIn?: number
}

type Play = { host?: number; insets: Record<string, number> }

const legOf = (
  { domain: { min, max } }: BaseGaugeSpec,
  target: number,
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
  playIn,
}: AnimatedGaugeProps) => {
  const insets = spec.insets ?? []
  const [play, setPlay] = useState<Play>({ insets: {} })

  const step = useEffectEvent((mode: PlayMode, amplitude: number) =>
    setPlay((prev) => ({
      host: legOf(spec, value, prev.host ?? value, mode, amplitude),
      insets: Object.fromEntries(
        insets.map((inset) => [
          inset.name,
          legOf(
            inset.spec,
            inset.value,
            prev.insets[inset.name] ?? inset.value,
            mode,
            amplitude
          ),
        ])
      ),
    }))
  )

  useEffect(() => {
    if (mode === "manual") return
    const next = () => step(mode, amplitude)
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
  const playing = mode !== "manual"

  const played = playing
    ? {
        ...spec,
        insets: insets.map((inset) => ({
          ...inset,
          value: play.insets[inset.name] ?? inset.value,
          spec: settles ? inset.spec : { ...inset.spec, transition: glide },
        })),
      }
    : spec

  return (
    <GaugePreview
      spec={played}
      value={playing ? (play.host ?? value) : value}
      transition={settles ? spec.transition : glide}
      playIn={playIn}
    />
  )
}
