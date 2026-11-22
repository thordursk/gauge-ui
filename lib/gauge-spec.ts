import type {
  FontFamily,
  FontWeight,
  GaugeFit,
  GaugeOrientation,
  GaugeTooltipPosition,
  GaugeTooltipSide,
  GaugeTransition,
  NeedleStyle,
  StrokeCap,
  TextAnchor,
  Zone,
} from "@/components/gauge"

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
  type GaugeOrientation,
  type GaugeTooltipPosition,
  type GaugeTooltipSide,
  type NeedleStyle,
  type StrokeCap,
  type TextAnchor,
  type Zone,
} from "@/components/gauge"

export type GaugeShape = "round" | "linear"

export type LabelFormat = "number" | "compass" | "clock"

export type TextSpec = {
  show: boolean
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
  length: number
  width: number
  color: string
  tail: number
  tailColor: string
  tailDot: number
  gap: number
  turns: number
}

export type GaugeSpec = {
  transition?: GaugeTransition
  rangeFrom?: number
  control?: { knob: boolean; step: number }
  insets?: GaugeInsetSpec[]
  domain: {
    shape: GaugeShape
    min: number
    max: number
    startAngle: number
    endAngle: number
    radius: number
    padding: number
    fit: GaugeFit
    orientation: GaugeOrientation
    length: number
    ends: number
  }
  face: { show: boolean; radius: number; color: string }
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
    colorByZone: boolean
    reverse: boolean
    from?: number
  }
  zones: {
    show: boolean
    list: Zone[]
    width: number
    offset: number
    gap: number
    cap: StrokeCap
    endCap: StrokeCap
    opacity: number
  }
  marks: {
    show: boolean
    values?: number[]
    length: number
    width: number
    color: string
    offset: number
    cap: StrokeCap
  }
  majorTicks: TickSpec
  minorTicks: TickSpec
  tickFill: {
    show: boolean
    mode: "fill" | "nearest"
    count: number
    length: number
    litLength: number
    width: number
    color: string
    dimColor: string
    offset: number
    cap: StrokeCap
  }
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
  dot: {
    show: boolean
    radius: number
    color: string
    opacity: number
    offset: number
    turns: number
    both: boolean
  }
  tooltip: {
    show: boolean
    open: boolean
    label: string
    unit: string
    decimals: number
    position: GaugeTooltipPosition
    side: GaugeTooltipSide
    offset: number
    gap: number
  }
  value: TextSpec & { decimals: number }
  unit: TextSpec & { text: string }
  title: TextSpec & { text: string }
}

export const barPadding = ({
  orientation,
  padding,
  ends,
}: GaugeSpec["domain"]) =>
  orientation === "vertical"
    ? { top: ends, right: padding, bottom: ends, left: padding }
    : { top: padding, right: ends, bottom: padding, left: ends }

export type GaugeInsetSpec = {
  name: string
  x: number
  y: number
  scale: number
  value: number
  spec: GaugeSpec
}
