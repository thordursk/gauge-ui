export type StrokeCap = "round" | "butt"
export type FontFamily = "sans" | "rounded" | "mono"
export type FontWeight = "regular" | "medium" | "semibold" | "bold"
export type NeedleStyle = "line" | "pointer" | "compass" | "arrow"
export type GaugeEnd = "from" | "to"
export type ValueColor = string | ((value: number) => string)
export type TextAnchor = "start" | "middle" | "end"

export type Zone = {
  to: number
  color: string
}

export const fontClass: Record<FontFamily, string> = {
  sans: "font-sans",
  rounded: "font-rounded",
  mono: "font-mono",
}

export const weightClass: Record<FontWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

export const zoneColor = (zones: Zone[], value: number, fallback: string) => {
  if (zones.length === 0) return fallback
  for (let i = 0; i < zones.length - 1; i++) {
    if (value < zones[i].to) return zones[i].color
  }
  return zones[zones.length - 1].color
}

export const zoneCutoffs = (zones: Zone[]) =>
  zones.slice(0, -1).map((zone) => zone.to)

const compassPoints = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
]

export const compassLabel = (degrees: number) => {
  const turn = ((degrees % 360) + 360) % 360
  const index = Math.round(turn / 22.5) % 16
  const exact = Math.abs(turn - index * 22.5) < 0.5
  return exact ? compassPoints[index] : `${Math.round(turn)}°`
}

export const clockLabel = (hours: number) =>
  String(((Math.round(hours) % 12) + 12) % 12 || 12)

const pad = (n: number) => String(n).padStart(2, "0")

export const clockTime = (hours: number) => {
  const minutes = Math.round((((hours % 24) + 24) % 24) * 60)
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
}

export const durationLabel = (hours: number) => {
  const minutes = Math.round(hours * 60)
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`
}

export const fadeColor = (color: string, percent: number) =>
  `color-mix(in oklch, ${color} ${percent}%, transparent)`
