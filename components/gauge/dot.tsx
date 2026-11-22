"use client"

import { valueToTurnedAngle } from "./math"
import type { GaugeEnd } from "./utils"

import { useGauge } from "./context"

export type GaugeDotProps = {
  radius?: number
  color?: string
  opacity?: number
  offset?: number
  turns?: number
  halo?: number
  haloColor?: string
  end?: GaugeEnd
}

export const GaugeDot = ({
  radius = 10,
  color = "currentColor",
  opacity = 1,
  offset = 0,
  turns = 1,
  halo = 0,
  haloColor = "var(--background)",
  end = "to",
}: GaugeDotProps) => {
  const gauge = useGauge()
  const position = valueToTurnedAngle(
    end === "from" ? gauge.from : gauge.value,
    gauge.min,
    gauge.max,
    gauge.scale.start,
    gauge.scale.end,
    turns
  )
  const { x, y } = gauge.scale.point(position, offset)

  return (
    <>
      {halo > 0 && (
        <circle
          cx={x}
          cy={y}
          r={radius + halo}
          fill={haloColor}
          fillOpacity={opacity}
        />
      )}
      <circle cx={x} cy={y} r={radius} fill={color} fillOpacity={opacity} />
    </>
  )
}
