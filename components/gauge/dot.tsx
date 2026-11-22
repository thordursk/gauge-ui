"use client"

import { stepValues, valueToTurnedAngle } from "./math"
import type { GaugeEnd, ValueColor } from "./utils"

import { useGauge } from "./context"

export type GaugeDotProps = {
  /** Radius of the dot itself, in SVG units. */
  radius?: number
  color?: string
  opacity?: number
  /** Offset of the dot's centre from the scale's reference line. */
  offset?: number
  /**
   * Sweeps of the scale the dot makes across the domain, as
   * `GaugeNeedle.turns`: two sends it round twice while the value crosses
   * the domain once.
   */
  turns?: number
  /**
   * Width of a ring drawn behind the dot in `haloColor`, so it stands off
   * whatever band it rides. 0 leaves the dot bare.
   */
  halo?: number
  /** Colour of the halo: the surface under the gauge, usually. */
  haloColor?: string
  /** Which end of a range the dot rides. Two dots, one at each end, make
      the handles of a range. */
  end?: GaugeEnd
}

/**
 * A disc riding the scale at the current value: the head of a progress ring,
 * a body on its orbit, the handle on a dial or a slider. `GaugeMarks` stands at fixed values
 * and points along the radius; this follows the value the way a needle does,
 * and is round at any size a stroke cap could not reach.
 */
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

export type GaugeDotsProps = {
  /**
   * Number of intervals across the domain; renders `count + 1` dots, both
   * ends included, as `GaugeTicks` does. On a closed ring the dot at `max`
   * is left out, since it would land on the one at `min`.
   */
  count?: number
  /** Domain values to put a dot at, in place of `count`. */
  values?: number[]
  /** Radius of each dot, in SVG units. */
  radius?: number
  /**
   * One colour, or a function of each dot's value to colour some apart: the
   * engines that are lit, or each in the colour of its zone.
   */
  color?: ValueColor
  opacity?: number
  /** Offset of the dots' centres from the scale's reference line. */
  offset?: number
}

/**
 * Round dots standing at fixed values along the scale: evenly spaced, or at
 * the `values` given. The dot indices of a watch face, a ring of LEDs, the
 * engines round a rocket's centre one. `GaugeDot` follows the value; these
 * stay put, as `GaugeTicks` and `GaugeMarks` do.
 */
export const GaugeDots = ({
  count = 10,
  values,
  radius = 4,
  color = "currentColor",
  opacity = 1,
  offset = 0,
}: GaugeDotsProps) => {
  const { min, max, scale, positionOf } = useGauge()
  const each = typeof color === "function" ? color : undefined
  const at = values ?? stepValues(min, max, count)
  if (!values && scale.closed) at.pop()

  return (
    <g
      fill={typeof color === "string" ? color : undefined}
      fillOpacity={opacity}
    >
      {at.map((value, i) => {
        const { x, y } = scale.point(positionOf(value), offset)
        return <circle key={i} cx={x} cy={y} r={radius} fill={each?.(value)} />
      })}
    </g>
  )
}
