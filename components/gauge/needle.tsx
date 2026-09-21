"use client"

import { polar, valueToTurnedAngle } from "./math"
import type { NeedleStyle } from "./utils"

import { useGauge } from "./context"

export type GaugeNeedleProps = {
  /**
   * `line` is a stroke with round ends, `pointer` a tapered blade that is
   * widest at the centre and ends in a rounded tip, and `compass` a lozenge
   * whose two halves can take different colours.
   */
  style?: NeedleStyle
  /** Length as a fraction of the reference radius. */
  length?: number
  /** Stroke width for `line`; width at the centre for the filled styles. */
  width?: number
  color?: string
  /** How far the needle extends behind the centre, in SVG units. */
  tail?: number
  /** Colour of the tail half of a `pointer` or `compass`. Defaults to `color`. */
  tailColor?: string
  /**
   * Sweeps of the arc the needle makes across the domain. A clock's minute
   * hand turns 12 times while the hour hand turns once.
   */
  turns?: number
}

const pts = (points: { x: number; y: number }[]) =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

/** A needle pointing at the current value. Add a `GaugeHub` for the pivot. */
export const GaugeNeedle = ({
  style = "line",
  length = 0.85,
  width = 6,
  color = "currentColor",
  tail = 30,
  tailColor = color,
  turns = 1,
}: GaugeNeedleProps) => {
  const { radius, value, min, max, startAngle, endAngle } = useGauge()

  const angle = valueToTurnedAngle(value, min, max, startAngle, endAngle, turns)

  const tip = polar(radius * length, angle)
  const back = polar(-tail, angle)

  if (style === "line") {
    return (
      <line
        x1={back.x}
        y1={back.y}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    )
  }

  /* The filled styles are two polygons meeting at the centre, so the tail can
     take its own colour. Their shared base runs across the pivot. Both ends
     keep a fifth of the width and are rounded off with a disc of that size,
     as a round cap would, so a thin needle never vanishes to a point. */
  const left = polar(width / 2, angle - 90)
  const right = polar(width / 2, angle + 90)
  const endRadius = width * 0.2
  const endLeft = polar(endRadius, angle - 90)
  const endRight = polar(endRadius, angle + 90)
  const blade = (end: { x: number; y: number }) =>
    pts([
      { x: end.x + endLeft.x, y: end.y + endLeft.y },
      { x: end.x + endRight.x, y: end.y + endRight.y },
      right,
      left,
    ])

  /* A pointer's tail is a blunt stub; a compass tapers the same both ways. */
  const rear =
    style === "compass"
      ? blade(back)
      : pts([
          { x: back.x + left.x * 0.6, y: back.y + left.y * 0.6 },
          { x: back.x + right.x * 0.6, y: back.y + right.y * 0.6 },
          right,
          left,
        ])

  return (
    <g>
      {tail > 0 && <polygon points={rear} fill={tailColor} />}
      {tail > 0 && style === "compass" && (
        <circle cx={back.x} cy={back.y} r={endRadius} fill={tailColor} />
      )}
      <polygon points={blade(tip)} fill={color} />
      <circle cx={tip.x} cy={tip.y} r={endRadius} fill={color} />
    </g>
  )
}

export type GaugeHubProps = {
  radius?: number
  color?: string
}

/** The pivot disc at the centre, drawn once however many needles there are. */
export const GaugeHub = ({
  radius = 12,
  color = "currentColor",
}: GaugeHubProps) => (radius > 0 ? <circle r={radius} fill={color} /> : null)
