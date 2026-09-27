/**
 * A normalised description of a gauge. The studio turns control panel values
 * into a `GaugeSpec`; the preview renders it with the gauge primitives and the
 * code generator prints the equivalent JSX. Keeping one shape in the middle
 * guarantees the copied code matches what is on screen.
 */

import type {
  FontFamily,
  FontWeight,
  GaugeFit,
  GaugeTransition,
  NeedleStyle,
  StrokeCap,
  TextAnchor,
  Zone,
} from "@/components/gauge"

// The primitive vocabulary and formatters live with the gauge component so
// they ship with it; the studio re-exports them for convenience.
export {
  clockLabel,
  compassLabel,
  fontClass,
  weightClass,
  zoneColor,
  zoneCutoffs,
  type FontFamily,
  type FontWeight,
  type GaugeFit,
  type NeedleStyle,
  type StrokeCap,
  type TextAnchor,
  type Zone,
} from "@/components/gauge"

/** How tick labels print a value: as a number, a compass point, or an hour. */
export type LabelFormat = "number" | "compass" | "clock"

export type TextSpec = {
  show: boolean
  /** Position in SVG units relative to the gauge centre. Positive y is down. */
  x: number
  y: number
  fontSize: number
  color: string
  font: FontFamily
  weight: FontWeight
  anchor: TextAnchor
}

export type TickSpec = {
  show: boolean
  /** Number of intervals; there is one more tick than intervals. */
  count: number
  length: number
  width: number
  color: string
  offset: number
  cap: StrokeCap
  opacity: number
}

export type NeedleSpec = {
  style: NeedleStyle
  /** Fraction of the radius. */
  length: number
  width: number
  color: string
  tail: number
  tailColor: string
  /** Radius of the disc at the end of the tail; 0 for none. */
  tailDot: number
  /** Radius of the clear circle that splits the needle at the centre; 0 for none. */
  gap: number
  /** Sweeps of the arc across the domain; 1 follows the value directly. */
  turns: number
}

export type GaugeSpec = {
  /** How the gauge settles on a new value. Absent means instant. */
  transition?: GaugeTransition
  /** Whole gauges drawn inside this one, such as a fuel dial under a speedo. */
  insets?: GaugeInsetSpec[]
  domain: {
    min: number
    max: number
    startAngle: number
    endAngle: number
    radius: number
    padding: number
    /** Square box, or one fitted to the arc's sweep. See `GaugeProps.fit`. */
    fit: GaugeFit
  }
  track: {
    show: boolean
    width: number
    color: string
    opacity: number
    cap: StrokeCap
    offset: number
  }
  arc: {
    show: boolean
    width: number
    color: string
    opacity: number
    cap: StrokeCap
    offset: number
    /** Take the colour of whichever zone the value currently sits in. */
    colorByZone: boolean
    /** Fill back from the end of the sweep rather than forward from the start. */
    reverse: boolean
  }
  zones: {
    show: boolean
    list: Zone[]
    width: number
    offset: number
    gap: number
    /** Cap at the joints between zones. */
    cap: StrokeCap
    /** Cap at the two outer ends of the band. */
    endCap: StrokeCap
    opacity: number
  }
  marks: {
    show: boolean
    length: number
    width: number
    color: string
    offset: number
    cap: StrokeCap
  }
  majorTicks: TickSpec
  minorTicks: TickSpec
  tickLabels: {
    show: boolean
    count: number
    offset: number
    fontSize: number
    color: string
    font: FontFamily
    weight: FontWeight
    decimals: number
    format: LabelFormat
  }
  needles: {
    show: boolean
    list: NeedleSpec[]
    hub: { radius: number; color: string }
  }
  /** A disc riding the arc at the value. See `GaugeDot`. */
  dot: {
    show: boolean
    /** Radius of the dot itself, not the gauge's. */
    radius: number
    color: string
    opacity: number
    offset: number
    turns: number
  }
  value: TextSpec & { decimals: number }
  unit: TextSpec & { text: string }
  title: TextSpec & { text: string }
}

/**
 * A second gauge placed inside the first. The nested spec is a whole gauge in
 * its own right, drawn at `scale` around (`x`, `y`); only its `domain.padding`
 * and `domain.fit` go unused, since an inset shares the host's viewport.
 */
export type GaugeInsetSpec = {
  /** Identifies the inset, and names the prop the generated code reads it from. */
  name: string
  /** Centre in SVG units relative to the host gauge. Positive y is down. */
  x: number
  y: number
  /** Size relative to the host gauge. */
  scale: number
  /** The value on show. The studio's own controls drive the host gauge only. */
  value: number
  spec: GaugeSpec
}
