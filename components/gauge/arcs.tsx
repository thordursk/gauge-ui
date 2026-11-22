"use client"

import { foldValue } from "./math"
import type { StrokeCap, Zone } from "./utils"

import { useGauge } from "./context"

type ArcStyleProps = {
  width?: number
  color?: string
  opacity?: number
  cap?: StrokeCap
  offset?: number
}

export const GaugeTrack = ({
  width = 24,
  color = "currentColor",
  opacity = 0.15,
  cap = "round",
  offset = 0,
}: ArcStyleProps) => {
  const { scale } = useGauge()
  return (
    <path
      d={scale.path(scale.start, scale.end, offset)}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap={cap}
    />
  )
}

export type GaugeArcProps = ArcStyleProps & {
  from?: number
  to?: number
  reverse?: boolean
  wrap?: boolean
}

export const GaugeArc = ({
  width = 24,
  color = "currentColor",
  opacity = 1,
  cap = "round",
  offset = 0,
  from,
  to,
  reverse = false,
  wrap = false,
}: GaugeArcProps) => {
  const gauge = useGauge()
  const { min, max, value, scale, positionOf } = gauge
  const tail = from ?? gauge.from
  let head = to ?? value
  const forward =
    gauge.range && gauge.wrap && from === undefined && to === undefined
  if (forward) head = tail + foldValue(head - tail, 0, Math.abs(max - min))
  const lo = Math.min(tail, head)
  const hi = Math.max(tail, head)

  let a0: number
  let a1: number
  if (wrap || forward) {
    const span = max - min
    if (span <= 0) return null
    const sweep = scale.end - scale.start
    const perUnit = sweep / span
    a0 = scale.start + ((((lo - min) % span) + span) % span) * perUnit
    a1 = a0 + Math.min((hi - lo) * perUnit, sweep)
  } else {
    ;[a0, a1] = reverse
      ? [positionOf(max - (hi - lo)), positionOf(max)]
      : [positionOf(lo), positionOf(hi)]
  }
  if (a1 <= a0) return null

  return (
    <path
      d={scale.path(a0, a1, offset)}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap={cap}
    />
  )
}

export type GaugeStackPart = {
  weight?: number
  to?: number
  color: string
  opacity?: number
}

export type GaugeStackProps = Omit<ArcStyleProps, "color"> & {
  parts: GaugeStackPart[]
  from?: number
}

export const GaugeStack = ({
  parts,
  width = 24,
  opacity = 1,
  cap = "butt",
  offset = 0,
  from,
}: GaugeStackProps) => {
  const gauge = useGauge()
  const { value, scale, positionOf } = gauge
  if (parts.length === 0) return null

  const total = parts.reduce((sum, p) => sum + (p.weight ?? 0), 0)
  const start = from ?? gauge.from
  const fill = value - start

  const ends = parts.reduce<number[]>(
    (acc, p) => [
      ...acc,
      p.to ??
        (acc.at(-1) ?? start) +
          (total > 0 ? (fill * (p.weight ?? 0)) / total : 0),
    ],
    []
  )

  return (
    <g opacity={opacity}>
      {parts.map((p, i) => {
        const a0 = positionOf(i === 0 ? start : ends[i - 1])
        const a1 = positionOf(Math.min(ends[i], value))
        if (a1 <= a0) return null
        return (
          <path
            key={i}
            d={scale.path(a0, a1, offset)}
            fill="none"
            stroke={p.color}
            strokeOpacity={p.opacity}
            strokeWidth={width}
            strokeLinecap={cap}
          />
        )
      })}
    </g>
  )
}

export type GaugeZonesProps = Omit<ArcStyleProps, "color"> & {
  zones: Zone[]
  gap?: number
  endCap?: StrokeCap
}

export const GaugeZones = ({
  zones,
  width = 8,
  opacity = 1,
  cap = "butt",
  endCap = cap,
  offset = 0,
  gap = 0,
}: GaugeZonesProps) => {
  const { min, max, scale, positionOf } = useGauge()
  if (zones.length === 0) return null

  const dot = (position: number, color: string, key: string) => {
    const { x, y } = scale.point(position, offset)
    return <circle key={key} cx={x} cy={y} r={width / 2} fill={color} />
  }

  const segments = zones.reduce<{ from: number; to: number }[]>(
    (acc, zone, i) => {
      const from = i === 0 ? min : acc[i - 1].to
      const isLast = i === zones.length - 1
      const to = isLast ? max : Math.min(Math.max(zone.to, from), max)
      acc.push({ from, to })
      return acc
    },
    []
  )

  return (
    <g opacity={opacity}>
      {zones.map((zone, i) => {
        const isFirst = i === 0
        const isLast = i === zones.length - 1
        const { from, to } = segments[i]
        const a0 = positionOf(from) + (isFirst ? 0 : gap / 2)
        const a1 = positionOf(to) - (isLast ? 0 : gap / 2)
        if (a1 <= a0) return null
        const startCap = isFirst ? endCap : cap
        const finishCap = isLast ? endCap : cap
        return (
          <g key={i}>
            <path
              d={scale.path(a0, a1, offset)}
              fill="none"
              stroke={zone.color}
              strokeWidth={width}
              strokeLinecap="butt"
            />
            {startCap === "round" && dot(a0, zone.color, "start")}
            {finishCap === "round" && dot(a1, zone.color, "end")}
          </g>
        )
      })}
    </g>
  )
}
