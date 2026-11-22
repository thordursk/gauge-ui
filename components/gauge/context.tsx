"use client"

import { createContext, useContext } from "react"

import { clamp, foldValue, valueToAngle } from "./math"
import {
  arcScale,
  lineScale,
  type GaugeOrientation,
  type GaugeScale,
} from "./scale"
import type { GaugeTransition } from "./transition"
import { useAnimatedValue } from "./use-animated-value"

export type GaugeRange = readonly [from: number, to: number]

export type GaugeReading = {
  value: number
  target: number
  from: number
  targetFrom: number
  range: boolean
  wrap: boolean
  min: number
  max: number
}

export type GaugeRoundShape = {
  shape: "round"
  startAngle: number
  endAngle: number
  radius: number
  angleOf: (value: number) => number
}

export type GaugeLinearShape = {
  shape: "linear"
  orientation: GaugeOrientation
  length: number
}

export type GaugeContextValue = GaugeReading & {
  scale: GaugeScale
  positionOf: (value: number) => number
} & (GaugeRoundShape | GaugeLinearShape)

export const GaugeContext = createContext<GaugeContextValue | null>(null)

export const useGauge = () => {
  const ctx = useContext(GaugeContext)
  if (!ctx) {
    throw new Error("Gauge primitives must be rendered inside <Gauge>.")
  }
  return ctx
}

export const useRoundGauge = (part: string) => {
  const ctx = useGauge()
  if (ctx.shape !== "round") {
    throw new Error(`${part} must be rendered inside a round <Gauge>.`)
  }
  return ctx
}

export type GaugeReadingProps = {
  value: number | GaugeRange
  min?: number
  max?: number
  transition?: GaugeTransition | boolean
  initialValue?: number | GaugeRange
  wrap?: boolean
}

export type GaugeDomainProps = GaugeReadingProps & {
  startAngle?: number
  endAngle?: number
  radius?: number
  rotate?: number
}

const useGaugeReading = ({
  value,
  min = 0,
  max = 100,
  transition,
  initialValue,
  wrap = false,
}: GaugeReadingProps): GaugeReading => {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const span = hi - lo
  const fold = (v: number) => foldValue(v, lo, hi)
  const settle = wrap ? fold : (v: number) => clamp(v, lo, hi)

  const range = typeof value !== "number"
  const ends = (pair: GaugeRange) =>
    wrap
      ? [settle(pair[0]), settle(pair[1])]
      : [settle(Math.min(...pair)), settle(Math.max(...pair))]
  const [targetFrom, target] = range ? ends(value) : [min, settle(value)]
  const [initialFrom, initialTo] =
    initialValue === undefined
      ? [undefined, undefined]
      : typeof initialValue === "number"
        ? [settle(initialValue), settle(initialValue)]
        : range
          ? ends(initialValue)
          : [undefined, settle(initialValue[1])]

  const shown = useAnimatedValue(target, transition, span, initialTo, wrap)
  const shownFrom = useAnimatedValue(
    targetFrom,
    transition,
    span,
    range ? initialFrom : undefined,
    wrap
  )

  return {
    value: wrap ? fold(shown) : shown,
    target,
    from: range && wrap ? fold(shownFrom) : shownFrom,
    targetFrom,
    range,
    wrap,
    min,
    max,
  }
}

export const useGaugeContextValue = ({
  startAngle = 40,
  endAngle = 320,
  radius = 200,
  rotate = 0,
  ...domain
}: GaugeDomainProps): GaugeContextValue & GaugeRoundShape => {
  const reading = useGaugeReading(domain)
  const turned = useAnimatedValue(
    rotate,
    domain.transition,
    360,
    undefined,
    true
  )
  const a0 = startAngle + turned
  const a1 = endAngle + turned
  const angleOf = (v: number) =>
    valueToAngle(v, reading.min, reading.max, a0, a1)

  return {
    ...reading,
    shape: "round",
    scale: arcScale(radius, a0, a1),
    positionOf: angleOf,
    startAngle: a0,
    endAngle: a1,
    radius,
    angleOf,
  }
}

export type LinearGaugeDomainProps = GaugeReadingProps & {
  orientation?: GaugeOrientation
  length?: number
}

export const useLinearGaugeContextValue = ({
  orientation = "horizontal",
  length = 400,
  ...domain
}: LinearGaugeDomainProps): GaugeContextValue & GaugeLinearShape => {
  const reading = useGaugeReading(domain)
  const scale = lineScale(orientation, length)

  return {
    ...reading,
    shape: "linear",
    scale,
    positionOf: (v) =>
      valueToAngle(v, reading.min, reading.max, scale.start, scale.end),
    orientation,
    length,
  }
}
