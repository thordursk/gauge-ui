export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const foldValue = (value: number, min: number, max: number) => {
  const lo = Math.min(min, max)
  const span = Math.abs(max - min)
  return span === 0 ? lo : lo + ((((value - lo) % span) + span) % span)
}

export const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180

export const polar = (radius: number, angle: number) => {
  const theta = degreesToRadians(angle + 90)
  return {
    x: round(radius * Math.cos(theta)),
    y: round(radius * Math.sin(theta)),
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000

export const valueToAngle = (
  value: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number
) => {
  const span = max - min
  const t = span === 0 ? 0 : (clamp(value, min, max) - min) / span
  return startAngle + t * (endAngle - startAngle)
}

export const valueToTurnedAngle = (
  value: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number,
  turns: number
) => {
  if (turns === 1) return valueToAngle(value, min, max, startAngle, endAngle)
  const span = max - min
  const t = span === 0 ? 0 : (value - min) / span
  return startAngle + ((t * turns) % 1) * (endAngle - startAngle)
}

export const arcPath = (radius: number, from: number, to: number) => {
  const sweep = Math.min(to - from, 360)
  if (sweep <= 0 || radius <= 0) return ""

  const pieces = Math.max(1, Math.ceil(sweep / 180))
  const step = sweep / pieces
  const start = polar(radius, from)
  const parts = [`M ${fmt(start.x)} ${fmt(start.y)}`]

  for (let i = 1; i <= pieces; i++) {
    const p = polar(radius, from + step * i)
    parts.push(`A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(p.x)} ${fmt(p.y)}`)
  }

  return parts.join(" ")
}

export const arcBox = (
  radius: number,
  from: number,
  to: number,
  padding = 0
) => {
  const sweep = clamp(to - from, 0, 360)
  const end = from + sweep
  const points = [{ x: 0, y: 0 }, polar(radius, from), polar(radius, end)]
  for (let a = Math.ceil(from / 90) * 90; a <= end; a += 90) {
    points.push(polar(radius, a))
  }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = round(Math.min(...xs) - padding)
  const y = round(Math.min(...ys) - padding)

  return {
    x,
    y,
    width: round(Math.max(...xs) + padding - x),
    height: round(Math.max(...ys) + padding - y),
  }
}

export const stepValues = (min: number, max: number, intervals: number) => {
  const n = Math.max(1, Math.round(intervals))
  return Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n)
}

export const cutValues = (min: number, max: number, segments: number) =>
  stepValues(min, max, segments).slice(1, -1)

export const angleToValue = (
  angle: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number
) => {
  let a = angle
  while (a < startAngle) a += 360
  while (a >= startAngle + 360) a -= 360
  if (a > endAngle) {
    a = a - endAngle < startAngle + 360 - a ? endAngle : startAngle
  }
  const sweep = endAngle - startAngle
  const t = sweep === 0 ? 0 : (a - startAngle) / sweep
  return min + t * (max - min)
}

const fmt = (n: number) => Number(n.toFixed(3)).toString()
