"use client"

import { useId } from "react"

import { polar, valueToTurnedAngle } from "./math"
import type { GaugeEnd, NeedleStyle } from "./utils"

import { useRoundGauge } from "./context"

export type GaugeNeedleProps = {
  style?: NeedleStyle
  length?: number
  width?: number
  color?: string
  tail?: number
  tailColor?: string
  tailDot?: number
  turns?: number
  gap?: number
  end?: GaugeEnd
}

const pts = (points: { x: number; y: number }[]) =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

export const GaugeNeedle = ({ gap = 0, ...props }: GaugeNeedleProps) => {
  const maskId = `gauge-needle-gap${useId().replace(/\W/g, "")}`
  if (gap <= 0) return <NeedleShape {...props} />

  return (
    <g>
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={-1e4}
        y={-1e4}
        width={2e4}
        height={2e4}
      >
        <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="white" />
        <circle r={gap} fill="black" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <NeedleShape {...props} />
      </g>
    </g>
  )
}

const NeedleShape = ({
  style = "line",
  length = 0.85,
  width = 6,
  color = "currentColor",
  tail = 30,
  tailColor = color,
  tailDot = 0,
  turns = 1,
  end = "to",
}: Omit<GaugeNeedleProps, "gap">) => {
  const gauge = useRoundGauge("GaugeNeedle")
  const { radius, min, max, startAngle, endAngle } = gauge
  const value = end === "from" ? gauge.from : gauge.value

  const angle = valueToTurnedAngle(value, min, max, startAngle, endAngle, turns)

  const tip = polar(radius * length, angle)
  const back = polar(-tail, angle)
  const endDot =
    tail > 0 && tailDot > 0 ? (
      <circle cx={back.x} cy={back.y} r={tailDot} fill={tailColor} />
    ) : null

  if (style === "arrow") {
    const reach = radius * length
    const headLength = Math.min(width * 4, reach)
    const base = polar(reach - headLength, angle)
    const shaftLeft = polar(width / 2, angle - 90)
    const shaftRight = polar(width / 2, angle + 90)
    const headLeft = polar(width * 2, angle - 90)
    const headRight = polar(width * 2, angle + 90)
    const offset = (
      p: { x: number; y: number },
      d: { x: number; y: number }
    ) => ({
      x: p.x + d.x,
      y: p.y + d.y,
    })

    return (
      <g>
        {tail > 0 && (
          <>
            <polygon
              points={pts([
                shaftLeft,
                shaftRight,
                offset(back, shaftRight),
                offset(back, shaftLeft),
              ])}
              fill={tailColor}
            />
            <circle cx={back.x} cy={back.y} r={width / 2} fill={tailColor} />
          </>
        )}
        <polygon
          points={pts([
            shaftLeft,
            offset(base, shaftLeft),
            offset(base, headLeft),
            tip,
            offset(base, headRight),
            offset(base, shaftRight),
            shaftRight,
          ])}
          fill={color}
        />
        {endDot}
      </g>
    )
  }

  if (style === "line") {
    return (
      <>
        <line
          x1={back.x}
          y1={back.y}
          x2={tip.x}
          y2={tip.y}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
        {endDot}
      </>
    )
  }

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
      {endDot}
    </g>
  )
}

export type GaugeHubProps = {
  radius?: number
  color?: string
}

export const GaugeHub = ({
  radius = 12,
  color = "currentColor",
}: GaugeHubProps) => (radius > 0 ? <circle r={radius} fill={color} /> : null)
