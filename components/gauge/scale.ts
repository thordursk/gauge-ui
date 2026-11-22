import { arcBox, arcPath, polar } from "./math"

export type GaugePoint = { x: number; y: number }
export type GaugeBox = { x: number; y: number; width: number; height: number }
export type GaugeOrientation = "horizontal" | "vertical"

export type GaugeScale = {
  start: number
  end: number
  closed: boolean
  point: (position: number, offset?: number) => GaugePoint
  path: (from: number, to: number, offset?: number) => string
  normal: (position: number) => GaugePoint
  box: (offset?: number) => GaugeBox
}

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
  normal: (angle) => polar(1, angle),
  box: (offset = 0) => arcBox(radius + offset, startAngle, endAngle),
})

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
    path: (from, to, offset = 0) => {
      if (to <= from || length <= 0) return ""
      if (to <= half) return segment(from, to, offset)
      const over = Math.min(to - half, length)
      return [
        from < half ? segment(from, half, offset) : "",
        segment(-half, -half + over, offset),
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
