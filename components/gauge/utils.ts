/**
 * Shared vocabulary and pure helpers for the gauge primitives: stroke and
 * font options, zones, and the formatters that turn a value into a label.
 * Everything here is framework-free so it can be used in generated code.
 */

export type StrokeCap = "round" | "butt"
export type FontFamily = "sans" | "rounded" | "mono"
export type FontWeight = "regular" | "medium" | "semibold" | "bold"
export type NeedleStyle = "line" | "pointer" | "compass"
/** Which edge of a text sits at its position: left, centre or right. */
export type TextAnchor = "start" | "middle" | "end"

export type Zone = {
  /** Upper cutoff of the zone in domain units. Ignored for the last zone. */
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

/** Colour of the zone a value falls in, or `fallback` when there are none. */
export const zoneColor = (zones: Zone[], value: number, fallback: string) => {
  if (zones.length === 0) return fallback
  for (let i = 0; i < zones.length - 1; i++) {
    if (value < zones[i].to) return zones[i].color
  }
  return zones[zones.length - 1].color
}

/** Cutoff values that separate neighbouring zones. */
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

/**
 * Formats a heading in degrees as a compass point when it lands on one of the
 * sixteen, and as degrees otherwise, so a 0–360 domain reads like a bezel:
 * N, 30°, 60°, E, and so on.
 */
export const compassLabel = (degrees: number) => {
  const turn = ((degrees % 360) + 360) % 360
  const index = Math.round(turn / 22.5) % 16
  const exact = Math.abs(turn - index * 22.5) < 0.5
  return exact ? compassPoints[index] : `${Math.round(turn)}°`
}

/** Formats a value in hours as a clock numeral, so 0 and 12 both read "12". */
export const clockLabel = (hours: number) =>
  String(((Math.round(hours) % 12) + 12) % 12 || 12)
