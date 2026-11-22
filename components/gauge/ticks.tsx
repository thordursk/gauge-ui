"use client"

import { cn } from "@/lib/utils"
import { cutValues, foldValue, stepValues } from "./math"
import type { GaugeContextValue } from "./context"
import {
  fadeColor,
  fontClass,
  weightClass,
  type FontFamily,
  type FontWeight,
  type StrokeCap,
  type TextAnchor,
  type ValueColor,
} from "./utils"

import { useGauge } from "./context"

const tickValues = ({ min, max, scale }: GaugeContextValue, count: number) => {
  const values = stepValues(min, max, count)
  if (scale.closed) values.pop()
  return values
}

type CrossLineProps = {
  length?: number
  width?: number
  color?: ValueColor
  opacity?: number
  cap?: StrokeCap
  offset?: number
}

const CrossLines = ({
  values,
  length = 12,
  lengthOf,
  width = 2,
  color = "currentColor",
  opacity = 1,
  cap = "round",
  offset = 0,
}: CrossLineProps & {
  values: number[]
  lengthOf?: (value: number) => number
}) => {
  const { scale, positionOf } = useGauge()
  const each = typeof color === "function" ? color : undefined

  return (
    <g
      stroke={typeof color === "string" ? color : undefined}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap={cap}
    >
      {values.map((value, i) => {
        const half = (lengthOf?.(value) ?? length) / 2
        const a = scale.point(positionOf(value), offset - half)
        const b = scale.point(positionOf(value), offset + half)
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={each?.(value)}
          />
        )
      })}
    </g>
  )
}

export type GaugeTicksProps = CrossLineProps & {
  count?: number
}

export const GaugeTicks = ({ count = 10, ...props }: GaugeTicksProps) => {
  const gauge = useGauge()
  return <CrossLines values={tickValues(gauge, count)} {...props} />
}

export type GaugeTickFillProps = Omit<CrossLineProps, "color"> & {
  count?: number
  from?: number
  to?: number
  mode?: "fill" | "nearest"
  color?: ValueColor
  dimColor?: ValueColor
  litLength?: number
}

export const GaugeTickFill = ({
  count = 40,
  from,
  to,
  mode = "fill",
  color = "currentColor",
  dimColor = fadeColor("currentColor", 15),
  length = 12,
  litLength = length,
  ...props
}: GaugeTickFillProps) => {
  const gauge = useGauge()
  const values = tickValues(gauge, count)
  const tail = from ?? gauge.from
  const head = to ?? gauge.value
  const span = Math.abs(gauge.max - gauge.min)
  const eps = span * 1e-6

  const ahead = (v: number) => foldValue(v - tail + eps, 0, span)
  const between = (v: number) =>
    gauge.wrap
      ? ahead(v) <= ahead(head) + eps
      : v >= Math.min(tail, head) - eps && v <= Math.max(tail, head) + eps

  const nearestTo = (target: number) => {
    const gap = (v: number) => {
      const d = Math.abs(v - target)
      return gauge.wrap ? Math.min(d, span - d) : d
    }
    return values.reduce((best, v) => (gap(v) < gap(best) ? v : best))
  }
  const ends =
    mode === "nearest"
      ? new Set(
          gauge.range || from !== undefined
            ? [nearestTo(tail), nearestTo(head)]
            : [nearestTo(head)]
        )
      : null

  const lit = new Map(
    values.map((v) => [v, ends ? ends.has(v) : between(v)] as const)
  )
  const paint = (c: ValueColor, v: number) =>
    typeof c === "function" ? c(v) : c

  return (
    <CrossLines
      values={values}
      length={length}
      lengthOf={(v) => (lit.get(v) ? litLength : length)}
      color={(v) => paint(lit.get(v) ? color : dimColor, v)}
      {...props}
    />
  )
}

export type GaugeMarksProps = CrossLineProps & {
  values?: number[]
  count?: number
}

export const GaugeMarks = ({ values, count, ...props }: GaugeMarksProps) => {
  const { min, max, scale } = useGauge()
  const marks =
    values ??
    (count && count > 1
      ? [...(scale.closed ? [min] : []), ...cutValues(min, max, count)]
      : [])
  return <CrossLines values={marks} {...props} />
}

export type GaugeTickLabelsProps = {
  count?: number
  offset?: number
  anchor?: TextAnchor
  fontSize?: number
  color?: ValueColor
  font?: FontFamily
  weight?: FontWeight
  decimals?: number
  format?: (value: number) => string
}

export const GaugeTickLabels = ({
  count = 10,
  offset = -48,
  anchor = "middle",
  fontSize = 16,
  color = "currentColor",
  font = "sans",
  weight = "medium",
  decimals = 0,
  format,
}: GaugeTickLabelsProps) => {
  const gauge = useGauge()
  const { scale, positionOf } = gauge
  const values = tickValues(gauge, count)
  const each = typeof color === "function" ? color : undefined

  return (
    <g
      fill={typeof color === "string" ? color : undefined}
      fontSize={fontSize}
      textAnchor={anchor}
      dominantBaseline="central"
      className={cn(fontClass[font], weightClass[weight], "tabular-nums")}
    >
      {values.map((value, i) => {
        const p = scale.point(positionOf(value), offset)
        return (
          <text key={i} x={p.x} y={p.y} fill={each?.(value)}>
            {format ? format(value) : value.toFixed(decimals)}
          </text>
        )
      })}
    </g>
  )
}
