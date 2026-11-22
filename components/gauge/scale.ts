import { arcBox, arcPath, polar } from "./math"

export type GaugePoint = { x: number; y: number }
export type GaugeBox = { x: number; y: number; width: number; height: number }
/** Which way a bar runs. A vertical one fills upward. */
export type GaugeOrientation = "horizontal" | "vertical"

export type GaugeScale = {
  /** Position of the start of the domain. */
  start: number
  /** Position of the end of the domain. */
  end: number
  /** The scale runs right round and meets itself, as a full ring does, so
      its two ends land on the same spot. */
  closed: boolean
  /** The point at a position, `offset` outward from the reference line. */
  point: (position: number, offset?: number) => GaugePoint
  /**
   * SVG path along the scale between two positions, `offset` outward. Empty
   * when `to` is not past `from`. It runs straight from one to the other:
   * past the end of a dial it carries on round the circle, and past the end
   * of a bar it carries on along the line.
   */
  path: (from: number, to: number, offset?: number) => string
  /**
   * SVG path that runs `length` along the scale from `start`, `offset`
   * outward, for a span that may carry past the end of the scale, as a
   * wrapped arc does. A dial carries it on round the circle, which on a
   * closed ring is its start again; a bar brings it back in at its start.
   * Capped at the length of the whole scale; empty when `length` is not
   * positive.
   */
  wrappedPath: (start: number, length: number, offset?: number) => string
  /** The outward direction at a position, as a unit vector. */
  normal: (position: number) => GaugePoint
  /**
   * Box round the whole scale with its reference line moved `offset`
   * outward. A dial's takes in its centre too, where a needle pivots.
   */
  box: (offset?: number) => GaugeBox
}

/** A dial's scale: a circle of `radius` swept from one gauge angle to another. */
export const arcScale = (
  radius: number,
  startAngle: number,
  endAngle: number
): GaugeScale => ({
  start: startAngle,
  end: endAngle,
  closed: endAngle - startAngle >= 360,
  point: (angle, offset = 0) => polar(radius + offset, angle),
  path: (from, to, offset = 0) => arcPath(radius + offset, from, to),
  wrappedPath: (start, length, offset = 0) =>
    arcPath(
      radius + offset,
      start,
      start + Math.min(length, endAngle - startAngle)
    ),
  normal: (angle) => polar(1, angle),
  box: (offset = 0) => arcBox(radius + offset, startAngle, endAngle),
})

/**
 * A bar's scale: a straight line of `length` centred on the origin, so text
 * placed at the gauge's centre sits at the middle of the bar. A vertical bar
 * is a horizontal one turned a quarter turn anticlockwise: it starts at the
 * bottom, and its outside is on the left.
 */
export const lineScale = (
  orientation: GaugeOrientation,
  length: number
): GaugeScale => {
  const half = length / 2
  const vertical = orientation === "vertical"

  const point = (position: number, offset = 0) =>
    vertical
      ? { x: round(-offset), y: round(-position) }
      : { x: round(position), y: round(-offset) }

  const segment = (from: number, to: number, offset: number) => {
    const a = point(from, offset)
    const b = point(to, offset)
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  }

  return {
    start: -half,
    end: half,
    closed: false,
    point,
    path: (from, to, offset = 0) =>
      to <= from || length <= 0 ? "" : segment(from, to, offset),
    wrappedPath: (start, span, offset = 0) => {
      if (span <= 0 || length <= 0) return ""
      const to = start + Math.min(span, length)
      if (to <= half) return segment(start, to, offset)
      return [
        start < half ? segment(start, half, offset) : "",
        segment(-half, to - length, offset),
      ]
        .filter(Boolean)
        .join(" ")
    },
    normal: () => (vertical ? { x: -1, y: 0 } : { x: 0, y: -1 }),
    box: (offset = 0) => {
      const o = Math.abs(offset)
      return vertical
        ? { x: -o, y: -half - o, width: 2 * o, height: length + 2 * o }
        : { x: -half - o, y: -o, width: length + 2 * o, height: 2 * o }
    },
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000
