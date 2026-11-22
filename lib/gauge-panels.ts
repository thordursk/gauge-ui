import {
  ControlsStore,
  type ControlConfig,
  type ControlValueUpdates,
  type ResolvedValues,
  type TransitionConfig,
} from "@/lib/controls"

import { clamp, type GaugeTransition } from "@/components/gauge"
import type {
  FontFamily,
  FontWeight,
  GaugeFit,
  GaugeOrientation,
  GaugeShape,
  GaugeSpec,
  GaugeTooltipPosition,
  GaugeTooltipSide,
  LabelFormat,
  NeedleSpec,
  NeedleStyle,
  StrokeCap,
  TextAnchor,
  TextSpec,
  TickSpec,
} from "@/lib/gauge-spec"

export const RADIUS = 200

type Option = string | { value: string; label: string; swatch?: string }
type Select = { type: "select"; options: Option[]; default: string }
type Axis = [number, number, number, number]
type Pad = { type: "pad"; x: Axis; y: Axis }

const toggle = (value: boolean): boolean => value
const select = (options: Option[], value: string): Select => ({
  type: "select",
  options,
  default: value,
})
const cap = (value: StrokeCap = "round") => select(["round", "butt"], value)
const font = (value: FontFamily = "sans") =>
  select(["sans", "rounded", "mono"], value)
const weight = (value: FontWeight = "medium") =>
  select(["regular", "medium", "semibold", "bold"], value)
const anchor = (value: TextAnchor = "middle") =>
  select(["start", "middle", "end"], value)
const position = (x: number, y: number): Pad => ({
  type: "pad",
  x: [x, -1, 1, 0.01],
  y: [y, -1, 1, 0.01],
})

export const palette = [
  { value: "primary", label: "Primary", css: "var(--primary)" },
  { value: "foreground", label: "Foreground", css: "var(--foreground)" },
  {
    value: "muted-foreground",
    label: "Subtle",
    css: "var(--muted-foreground)",
  },
  { value: "muted", label: "Muted", css: "var(--muted)" },
  { value: "background", label: "Background", css: "var(--background)" },
  { value: "destructive", label: "Red", css: "var(--destructive)" },
  { value: "green", label: "Green", css: "#22c55e" },
  { value: "amber", label: "Amber", css: "#f59e0b" },
  { value: "blue", label: "Blue", css: "#38bdf8" },
] as const

export type Token = (typeof palette)[number]["value"]

const paletteCss = new Map<string, string>(
  palette.map((entry) => [entry.value, entry.css])
)

const DEFAULT_CUSTOM = "#38bdf8"

const CUSTOM_SWATCH =
  "conic-gradient(from 0.5turn, #f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171)"

export type Flat = Record<string, unknown>
export const flatValues = (panelId: string): Flat =>
  ControlsStore.getValues(panelId)

type ColorFolder = { token: Select; custom: string; _collapsed: true }

const color = (flat: Flat, path: string, token: Token): ColorFolder => {
  const folder: Record<string, unknown> = {
    token: select(
      [
        ...palette.map(({ value, label, css }) => ({
          value,
          label,
          swatch: css,
        })),
        { value: "custom", label: "Custom", swatch: CUSTOM_SWATCH },
      ],
      token
    ),
    _collapsed: true,
  }
  if (flat[`${path}.token`] === "custom") {
    const current = flat[`${path}.custom`]
    folder.custom = typeof current === "string" ? current : DEFAULT_CUSTOM
  }
  return folder as ColorFolder
}

export type ColorValue = { token: string; custom?: string }
export const css = (c: ColorValue) =>
  c.token === "custom"
    ? (c.custom ?? DEFAULT_CUSTOM)
    : (paletteCss.get(c.token) ?? `var(--${c.token})`)

export const stepFor = (span: number) =>
  span > 0 ? Math.pow(10, Math.floor(Math.log10(span)) - 2) : 1

export const playModes = ["manual", "sweep", "wander", "jump"] as const
export type PlayMode = (typeof playModes)[number]

export type LayerKind = "host" | "inset"

const HOST_ONLY = ["padding", "ends", "fit", "stage", "control"] as const
const INSET_ONLY = ["placement"] as const

const ROUND_ONLY = ["startAngle", "endAngle", "fit"] as const
const LINEAR_ONLY = ["orientation", "length", "ends"] as const

const without = <T extends object>(config: T, keys: readonly string[]): T =>
  Object.fromEntries(
    Object.entries(config).filter(([key]) => !keys.includes(key))
  ) as T

const fullGaugeConfig = (flat: Flat = {}) =>
  ({
    shape: select(["round", "linear"], "round"),
    min: [0, -100, 100, 1],
    max: [100, -99, 1000, 1],
    startAngle: [40, 0, 360, 1],
    endAngle: [320, 180, 540, 1],
    orientation: select(["horizontal", "vertical"], "horizontal"),
    length: [400, 100, 800, 10],
    padding: [56, 0, 200, 1],
    ends: [24, 0, 200, 1],
    fit: select(["square", "content"], "square"),
    stage: color(flat, "stage", "background"),
    control: select(
      [
        "off",
        { value: "ring", label: flat.shape === "linear" ? "Bar" : "Ring" },
        "knob",
      ],
      "off"
    ),
    placement: {
      position: position(0, 0),
      scale: [0.5, 0.05, 1.5, 0.01],
    },
  }) satisfies ControlConfig

export const gaugeConfig = (flat: Flat = {}, kind: LayerKind = "host") =>
  without(fullGaugeConfig(flat), [
    ...(kind === "host" ? INSET_ONLY : HOST_ONLY),
    ...(flat.shape === "linear" ? ROUND_ONLY : LINEAR_ONLY),
  ])

export const valueConfig = (min: number, max: number, flat?: Flat) =>
  ({
    value: [clamp(62, min, max), min, max, stepFor(max - min)],
    range: toggle(false),
    ...((flat === undefined || flat.range === true
      ? { from: [clamp(30, min, max), min, max, stepFor(max - min)] }
      : {}) as { from: Axis }),
    mode: select([...playModes], "manual"),
    period: [3, 0.2, 20, 0.1],
    amplitude: [0.25, 0, 1, 0.01],
    animate: toggle(true),
    motion: { type: "spring", visualDuration: 0.5, bounce: 0.1 },
  }) satisfies ControlConfig

export const arcsConfig = (flat: Flat = {}, linear = false) =>
  without(
    {
      track: {
        show: toggle(true),
        width: [24, 1, 80, 1],
        color: color(flat, "track.color", "muted"),
        opacity: [1, 0, 1, 0.01],
        cap: cap("round"),
        offset: [0, -120, 120, 1],
      },
      arc: {
        show: toggle(true),
        width: [24, 1, 80, 1],
        color: color(flat, "arc.color", "primary"),
        colorByZone: toggle(false),
        reverse: toggle(false),
        fromZero: toggle(false),
        opacity: [1, 0, 1, 0.01],
        cap: cap("round"),
        offset: [0, -120, 120, 1],
      },
      face: {
        show: toggle(false),
        radius: [150, 1, 260, 1],
        color: color(flat, "face.color", "muted"),
      },
    } satisfies ControlConfig,
    linear ? ["face"] : []
  )

export const cutoffsConfig = (min: number, max: number, flat: Flat = {}) => {
  const step = stepFor(max - min)
  const at = (t: number): Axis => [min + (max - min) * t, min, max, step]
  return {
    show: toggle(false),
    count: [3, 1, 4, 1],
    zone1: { to: at(0.5), color: color(flat, "zone1.color", "muted") },
    zone2: {
      to: at(0.75),
      color: color(flat, "zone2.color", "muted-foreground"),
    },
    zone3: { to: at(0.9), color: color(flat, "zone3.color", "foreground") },
    zone4: { color: color(flat, "zone4.color", "primary") },
    band: {
      width: [8, 1, 60, 1],
      offset: [-24, -120, 120, 1],
      gap: [1.5, 0, 10, 0.5],
      cap: cap("butt"),
      endCap: cap("butt"),
      opacity: [1, 0, 1, 0.01],
    },
    marks: {
      show: toggle(false),
      length: [16, 1, 80, 1],
      width: [3, 0.5, 12, 0.5],
      color: color(flat, "marks.color", "foreground"),
      offset: [0, -120, 120, 1],
      cap: cap("round"),
    },
  } satisfies ControlConfig
}

const tickConfig = (
  flat: Flat,
  path: string,
  count: number,
  length: number,
  width: number,
  opacity: number
) =>
  ({
    show: toggle(false),
    count: [count, 1, 100, 1],
    length: [length, 1, 80, 1],
    width: [width, 0.5, 12, 0.5],
    color: color(flat, `${path}.color`, "muted-foreground"),
    offset: [-44, -160, 160, 1],
    cap: cap("round"),
    opacity: [opacity, 0, 1, 0.01],
  }) satisfies ControlConfig

export const ticksConfig = (flat: Flat = {}) =>
  ({
    major: tickConfig(flat, "major", 10, 16, 3, 1),
    minor: { ...tickConfig(flat, "minor", 50, 8, 1.5, 0.6), _collapsed: true },
    fill: {
      show: toggle(false),
      mode: select(["fill", "nearest"], "fill"),
      count: [40, 1, 120, 1],
      length: [24, 0, 80, 1],
      litLength: [24, 0, 80, 1],
      width: [6, 0.5, 20, 0.5],
      color: color(flat, "fill.color", "primary"),
      dimColor: color(flat, "fill.dimColor", "muted"),
      offset: [0, -160, 160, 1],
      cap: cap("round"),
      _collapsed: true,
    },
    labels: {
      show: toggle(false),
      count: [10, 1, 40, 1],
      offset: [-76, -220, 220, 1],
      fontSize: [18, 6, 60, 1],
      color: color(flat, "labels.color", "muted-foreground"),
      font: font("sans"),
      weight: weight("medium"),
      decimals: [0, 0, 3, 1],
      format: select(["number", "compass", "clock"], "number"),
      _collapsed: true,
    },
  }) satisfies ControlConfig

const textConfig = (
  flat: Flat,
  path: string,
  show: boolean,
  text: string,
  x: number,
  y: number,
  size: number,
  token: Token
) =>
  ({
    show,
    text,
    position: position(x, y),
    fontSize: [size, 6, 120, 1],
    color: color(flat, `${path}.color`, token),
    font: font("sans"),
    weight: weight("medium"),
    anchor: anchor("middle"),
  }) satisfies ControlConfig

export const textPanelConfig = (flat: Flat = {}) =>
  ({
    value: {
      show: toggle(true),
      position: position(0, 0),
      fontSize: [96, 8, 240, 1],
      color: color(flat, "value.color", "foreground"),
      font: font("rounded"),
      weight: weight("semibold"),
      decimals: [0, 0, 3, 1],
      anchor: anchor("middle"),
    },
    unit: {
      ...textConfig(
        flat,
        "unit",
        true,
        "km/h",
        0,
        -0.34,
        28,
        "muted-foreground"
      ),
      _collapsed: true,
    },
    title: {
      ...textConfig(
        flat,
        "title",
        false,
        "Speed",
        0,
        0.33,
        24,
        "muted-foreground"
      ),
      _collapsed: true,
    },
  }) satisfies ControlConfig

const needleFolder = (
  flat: Flat,
  path: string,
  style: NeedleStyle,
  length: number,
  width: number,
  tail: number,
  turns: number
) =>
  ({
    style: select(["line", "pointer", "compass", "arrow"], style),
    length: [length, 0.1, 1.2, 0.01],
    width: [width, 1, 40, 0.5],
    color: color(flat, `${path}.color`, "foreground"),
    tail: [tail, 0, 200, 1],
    tailColor: color(flat, `${path}.tailColor`, "foreground"),
    tailDot: [0, 0, 40, 0.5],
    gap: [0, 0, 200, 1],
    turns: [turns, 1, 720, 1],
  }) satisfies ControlConfig

export const needleConfig = (flat: Flat = {}) =>
  ({
    show: toggle(false),
    count: [1, 1, 3, 1],
    needle1: needleFolder(flat, "needle1", "line", 0.85, 6, 30, 1),
    needle2: {
      ...needleFolder(flat, "needle2", "line", 0.8, 3, 0, 12),
      _collapsed: true,
    },
    needle3: {
      ...needleFolder(flat, "needle3", "line", 0.9, 1.5, 30, 720),
      _collapsed: true,
    },
    hub: {
      radius: [12, 0, 60, 1],
      color: color(flat, "hub.color", "foreground"),
    },
  }) satisfies ControlConfig

export const dotConfig = (flat: Flat = {}) =>
  ({
    show: toggle(false),
    radius: [10, 1, 60, 0.5],
    color: color(flat, "color", "foreground"),
    opacity: [1, 0, 1, 0.01],
    offset: [0, -120, 120, 1],
    turns: [1, 1, 720, 1],
    ends: select(["value", "both"], "value"),
  }) satisfies ControlConfig

export const tooltipConfig = () =>
  ({
    show: toggle(false),
    pin: toggle(false),
    label: "Value",
    unit: "",
    decimals: [0, 0, 3, 1],
    position: select(
      [
        "value",
        "pointer",
        "center",
        "top",
        "right",
        "bottom",
        "left",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ],
      "value"
    ),
    side: select(["auto", "center", "top", "right", "bottom", "left"], "auto"),
    offset: [24, -160, 160, 1],
    gap: [8, 0, 64, 1],
  }) satisfies ControlConfig

export type GaugeValues = ResolvedValues<ReturnType<typeof gaugeConfig>>
export type ValueValues = ResolvedValues<ReturnType<typeof valueConfig>>
export type ArcsValues = ResolvedValues<ReturnType<typeof arcsConfig>>
export type CutoffsValues = ResolvedValues<ReturnType<typeof cutoffsConfig>>
export type TicksValues = ResolvedValues<ReturnType<typeof ticksConfig>>
export type TextValues = ResolvedValues<ReturnType<typeof textPanelConfig>>
export type NeedleValues = ResolvedValues<ReturnType<typeof needleConfig>>
export type DotValues = ResolvedValues<ReturnType<typeof dotConfig>>
export type TooltipValues = ResolvedValues<ReturnType<typeof tooltipConfig>>

export type PanelValues = {
  gauge: GaugeValues
  value: ValueValues
  arcs: ArcsValues
  cutoffs: CutoffsValues
  ticks: TicksValues
  text: TextValues
  needle: NeedleValues
  dot: DotValues
  tooltip: TooltipValues
}

export type PanelUpdates = {
  gauge?: ControlValueUpdates<ReturnType<typeof gaugeConfig>>
  value?: ControlValueUpdates<ReturnType<typeof valueConfig>>
  arcs?: ControlValueUpdates<ReturnType<typeof arcsConfig>>
  cutoffs?: ControlValueUpdates<ReturnType<typeof cutoffsConfig>>
  ticks?: ControlValueUpdates<ReturnType<typeof ticksConfig>>
  text?: ControlValueUpdates<ReturnType<typeof textPanelConfig>>
  needle?: ControlValueUpdates<ReturnType<typeof needleConfig>>
  dot?: ControlValueUpdates<ReturnType<typeof dotConfig>>
  tooltip?: ControlValueUpdates<ReturnType<typeof tooltipConfig>>
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

export const defaultsOf = <T extends ControlConfig>(
  config: T
): ResolvedValues<T> => {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(config)) {
    if (key === "_collapsed") continue
    const entry: unknown = raw
    if (Array.isArray(entry)) out[key] = entry[0]
    else if (isRecord(entry) && entry.type === "select")
      out[key] = entry.default
    else if (isRecord(entry) && entry.type === "pad") {
      const pad = entry as unknown as Pad
      out[key] = { x: pad.x[0], y: pad.y[0] }
    } else if (
      isRecord(entry) &&
      (entry.type === "spring" || entry.type === "easing")
    )
      out[key] = entry
    else if (isRecord(entry)) out[key] = defaultsOf(entry as ControlConfig)
    else out[key] = entry
  }
  return out as ResolvedValues<T>
}

export const withoutMeta = <T>(values: T): T => {
  if (!isRecord(values)) return values
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("_")) continue
    out[key] = withoutMeta(value)
  }
  return out as T
}

export const mergeValues = <T>(base: T, updates: unknown): T => {
  if (!isRecord(base) || !isRecord(updates)) return (updates ?? base) as T
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    out[key] = mergeValues(out[key], value)
  }
  return out as T
}

export const defaultPanelValues = (min = 0, max = 100): PanelValues => ({
  gauge: defaultsOf(fullGaugeConfig()),
  value: defaultsOf(valueConfig(min, max)),
  arcs: defaultsOf(arcsConfig()),
  cutoffs: defaultsOf(cutoffsConfig(min, max)),
  ticks: defaultsOf(ticksConfig()),
  text: defaultsOf(textPanelConfig()),
  needle: defaultsOf(needleConfig()),
  dot: defaultsOf(dotConfig()),
  tooltip: defaultsOf(tooltipConfig()),
})

export const resolvePanelValues = (updates: PanelUpdates): PanelValues => {
  const min = updates.gauge?.min ?? gaugeConfig().min[0]
  const max = updates.gauge?.max ?? gaugeConfig().max[0]
  return mergeValues(defaultPanelValues(min, max), updates)
}

export const domainOf = (gauge: GaugeValues) => ({
  min: Math.min(gauge.min, gauge.max - 1),
  max: gauge.max,
})

export const toGaugeTransition = (t: TransitionConfig): GaugeTransition => {
  if (t.type === "easing")
    return { type: "tween", duration: t.duration, ease: t.ease }
  const spring: GaugeTransition = { type: "spring" }
  for (const key of [
    "stiffness",
    "damping",
    "mass",
    "visualDuration",
    "bounce",
  ] as const) {
    if (t[key] !== undefined) spring[key] = t[key]
  }
  return spring
}

export const buildSpec = (v: PanelValues): GaugeSpec => {
  const { gauge, value, arcs, cutoffs, ticks, text, needle, dot, tooltip } = v
  const { min, max } = domainOf(gauge)
  const linear = gauge.shape === "linear"

  const zoneFolders: { to?: number; color: ColorValue }[] = [
    cutoffs.zone1,
    cutoffs.zone2,
    cutoffs.zone3,
    cutoffs.zone4,
  ].slice(0, cutoffs.count)
  let floor = min
  const zoneList = zoneFolders.map((z, i) => {
    const isLast = i === zoneFolders.length - 1
    const to = isLast ? max : clamp(Math.max(z.to ?? floor, floor), min, max)
    floor = to
    return { to, color: css(z.color) }
  })

  const tick = (t: typeof ticks.major): TickSpec => ({
    show: t.show,
    count: t.count,
    length: t.length,
    width: t.width,
    color: css(t.color),
    offset: t.offset,
    cap: t.cap as StrokeCap,
    opacity: t.opacity,
  })

  const needleSpec = (n: typeof needle.needle1): NeedleSpec => ({
    style: n.style as NeedleStyle,
    length: n.length,
    width: n.width,
    color: css(n.color),
    tail: n.tail,
    tailColor: css(n.tailColor),
    tailDot: n.tailDot,
    gap: n.gap,
    turns: n.turns,
  })

  const label = (t: typeof text.unit): TextSpec => ({
    show: t.show,
    x: t.position.x * RADIUS,
    y: -t.position.y * RADIUS,
    fontSize: t.fontSize,
    color: css(t.color),
    font: t.font as FontFamily,
    weight: t.weight as FontWeight,
    anchor: t.anchor as TextAnchor,
  })

  return {
    transition: value.animate ? toGaugeTransition(value.motion) : undefined,
    rangeFrom: value.range ? clamp(value.from, min, max) : undefined,
    control:
      gauge.control === "off" || (!linear && gauge.fit === "content")
        ? undefined
        : { knob: gauge.control === "knob", step: stepFor(max - min) },
    domain: {
      shape: gauge.shape as GaugeShape,
      min,
      max,
      startAngle: gauge.startAngle,
      endAngle: Math.max(gauge.endAngle, gauge.startAngle + 1),
      radius: RADIUS,
      padding: gauge.padding,
      fit: gauge.fit as GaugeFit,
      orientation: gauge.orientation as GaugeOrientation,
      length: gauge.length,
      ends: gauge.ends,
    },
    face: {
      ...arcs.face,
      show: !linear && arcs.face.show,
      color: css(arcs.face.color),
    },
    track: {
      ...arcs.track,
      color: css(arcs.track.color),
      cap: arcs.track.cap as StrokeCap,
    },
    arc: {
      show: arcs.arc.show,
      width: arcs.arc.width,
      color: css(arcs.arc.color),
      opacity: arcs.arc.opacity,
      cap: arcs.arc.cap as StrokeCap,
      offset: arcs.arc.offset,
      colorByZone: cutoffs.show && arcs.arc.colorByZone,
      reverse: arcs.arc.reverse,
      from: arcs.arc.fromZero ? clamp(0, min, max) : undefined,
    },
    zones: {
      show: cutoffs.show,
      list: zoneList,
      width: cutoffs.band.width,
      offset: cutoffs.band.offset,
      gap: cutoffs.band.gap,
      cap: cutoffs.band.cap as StrokeCap,
      endCap: cutoffs.band.endCap as StrokeCap,
      opacity: cutoffs.band.opacity,
    },
    marks: {
      ...cutoffs.marks,
      show: cutoffs.show && cutoffs.marks.show,
      color: css(cutoffs.marks.color),
      cap: cutoffs.marks.cap as StrokeCap,
    },
    majorTicks: tick(ticks.major),
    minorTicks: tick(ticks.minor),
    tickFill: {
      show: ticks.fill.show,
      mode: ticks.fill.mode as "fill" | "nearest",
      count: ticks.fill.count,
      length: ticks.fill.length,
      litLength: ticks.fill.litLength,
      width: ticks.fill.width,
      color: css(ticks.fill.color),
      dimColor: css(ticks.fill.dimColor),
      offset: ticks.fill.offset,
      cap: ticks.fill.cap as StrokeCap,
    },
    tickLabels: {
      ...ticks.labels,
      color: css(ticks.labels.color),
      font: ticks.labels.font as FontFamily,
      weight: ticks.labels.weight as FontWeight,
      format: ticks.labels.format as LabelFormat,
    },
    needles: {
      show: !linear && needle.show,
      list: [needle.needle1, needle.needle2, needle.needle3]
        .slice(0, needle.count)
        .map(needleSpec),
      hub: { radius: needle.hub.radius, color: css(needle.hub.color) },
    },
    dot: {
      show: dot.show,
      radius: dot.radius,
      color: css(dot.color),
      opacity: dot.opacity,
      offset: dot.offset,
      turns: dot.turns,
      both: dot.ends === "both",
    },
    tooltip: {
      show: tooltip.show,
      open: tooltip.pin,
      label: tooltip.label,
      unit: tooltip.unit,
      decimals: tooltip.decimals,
      position: tooltip.position as GaugeTooltipPosition,
      side: tooltip.side as GaugeTooltipSide,
      offset: tooltip.offset,
      gap: tooltip.gap,
    },
    value: {
      show: text.value.show,
      x: text.value.position.x * RADIUS,
      y: -text.value.position.y * RADIUS,
      fontSize: text.value.fontSize,
      color: css(text.value.color),
      font: text.value.font as FontFamily,
      weight: text.value.weight as FontWeight,
      anchor: text.value.anchor as TextAnchor,
      decimals: text.value.decimals,
    },
    unit: { ...label(text.unit), text: text.unit.text },
    title: { ...label(text.title), text: text.title.text },
  }
}
