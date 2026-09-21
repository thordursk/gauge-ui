"use client"

import { createContext, useContext } from "react"

import { clamp, valueToAngle } from "./math"
import type { GaugeTransition } from "./transition"
import { useAnimatedValue } from "./use-animated-value"

export type GaugeContextValue = {
  /** Value being drawn this frame, clamped to the domain. Animated when the
      gauge has a transition. */
  value: number
  /** Value the gauge is heading for; equals `value` once settled. */
  target: number
  min: number
  max: number
  startAngle: number
  endAngle: number
  /** Radius of the gauge's reference circle in SVG units. */
  radius: number
  /** Maps a domain value onto a gauge angle. */
  angleOf: (value: number) => number
}

export const GaugeContext = createContext<GaugeContextValue | null>(null)

export const useGauge = () => {
  const ctx = useContext(GaugeContext)
  if (!ctx) {
    throw new Error("Gauge primitives must be rendered inside <Gauge>.")
  }
  return ctx
}

/** The domain, geometry and animation every gauge root takes. */
export type GaugeDomainProps = {
  value: number
  min?: number
  max?: number
  /** Gauge degrees, clockwise from six o'clock. */
  startAngle?: number
  endAngle?: number
  /** Reference radius in SVG units. Every child positions itself against this. */
  radius?: number
  /**
   * Animate towards new values. `true` uses a gentle spring; pass a
   * `GaugeTransition` to tune it or switch to a timed tween. Omit for
   * instant updates.
   */
  transition?: GaugeTransition | boolean
  /** Where the value starts on mount when animating, for a sweep-in effect. */
  initialValue?: number
}

/**
 * Resolves the domain and follows the value, returning the context a gauge
 * root publishes to its children. Shared by `Gauge` and `GaugeInset` so a
 * gauge nested inside another animates and maps values exactly like a
 * top-level one, and so the defaults live in one place.
 */
export const useGaugeContextValue = ({
  value,
  min = 0,
  max = 100,
  startAngle = 40,
  endAngle = 320,
  radius = 200,
  transition,
  initialValue,
}: GaugeDomainProps): GaugeContextValue => {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const target = clamp(value, lo, hi)
  const shown = useAnimatedValue(
    target,
    transition,
    hi - lo,
    initialValue === undefined ? undefined : clamp(initialValue, lo, hi)
  )

  return {
    value: shown,
    target,
    min,
    max,
    startAngle,
    endAngle,
    radius,
    angleOf: (v) => valueToAngle(v, min, max, startAngle, endAngle),
  }
}
