import {
  NO_PAINT,
  RADIUS,
  defaultPanelValues,
  resolvePanelValues,
  type PanelUpdates,
} from "@/lib/gauge-panels"
import {
  hostLayer,
  layerName,
  specOf,
  type Composition,
} from "@/lib/gauge-layers"

export type TemplateInset = {
  name: string
  values: PanelUpdates
}

export const templateCategories = [
  { id: "arcs", name: "Arcs" },
  { id: "rings", name: "Rings" },
  { id: "needles", name: "Needles" },
  { id: "composed", name: "Composed" },
  { id: "bars", name: "Bars" },
] as const

export type TemplateCategory = (typeof templateCategories)[number]["id"]

type DialCategory = Exclude<TemplateCategory, "composed" | "bars">

type TemplateSource = {
  id: string
  name: string
  category?: DialCategory
  values: PanelUpdates
  insets?: TemplateInset[]
}

export type GaugeTemplate = Omit<TemplateSource, "category"> & {
  category: TemplateCategory
}

const categoryOf = ({
  values,
  insets,
  category = "arcs",
}: TemplateSource): TemplateCategory =>
  values.gauge?.shape === "linear"
    ? "bars"
    : insets?.length
      ? "composed"
      : category

const token = (name: string) => ({ token: name })

const insetHalfDial = (
  x: number,
  value: number,
  title: string,
  color: ReturnType<typeof token>
): PanelUpdates => ({
  gauge: {
    min: 0,
    max: 100,
    startAngle: 90,
    endAngle: 270,
    placement: { position: { x, y: -0.55 }, scale: 0.4 },
  },
  value: { value },
  arcs: { track: { width: 30 }, arc: { width: 30, color } },
  text: {
    value: {
      fontSize: 88,
      font: "rounded",
      weight: "bold",
      position: { x: -0.12, y: 0.12 },
    },
    unit: {
      show: true,
      text: "%",
      fontSize: 44,
      anchor: "start",
      position: { x: 0.26, y: 0.16 },
    },
    title: {
      show: true,
      text: title,
      fontSize: 52,
      weight: "semibold",
      position: { x: 0, y: -0.5 },
    },
  },
})

const sprintRing = (
  x: number,
  y: number,
  value: number,
  title: string,
  done: number,
  total: number
): PanelUpdates => ({
  gauge: {
    min: 0,
    max: 100,
    startAngle: 180,
    endAngle: 540,
    placement: { position: { x, y }, scale: 0.42 },
  },
  value: { value },
  arcs: {
    track: { width: 36 },
    arc: { width: 36, color: token("foreground") },
  },
  tooltip: {
    show: true,
    label: `${done} of ${total} tasks`,
    unit: "%",
    position: "value",
    side: x < 0 ? "left" : "right",
  },
  text: {
    value: { show: false },
    unit: { show: false },
    title: {
      show: true,
      text: title,
      fontSize: 52,
      weight: "semibold",
      position: { x: 0, y: 0 },
    },
  },
})

const planetOrbit = (
  offset: number,
  at: number,
  size: number,
  inset = false
): PanelUpdates => ({
  gauge: {
    min: 0,
    max: 360,
    startAngle: 180,
    endAngle: 540,
    ...(inset ? { placement: { position: { x: 0, y: 0 }, scale: 1 } } : {}),
  },
  value: { value: at },
  arcs: {
    track: {
      width: 3,
      color: token("muted-foreground"),
      opacity: 0.7,
      cap: "butt",
      offset,
    },
    arc: { width: 3, color: token("foreground"), cap: "butt", offset },
  },
  dot: { show: true, radius: size, color: token("foreground"), offset },
  text: { value: { show: false }, unit: { show: false } },
})

type MarksUpdates = NonNullable<PanelUpdates["cutoffs"]>["marks"]

const marksAt = (
  values: number[],
  marks: MarksUpdates
): PanelUpdates["cutoffs"] => ({
  show: true,
  band: { show: false },
  marks: {
    show: true,
    values: values.join(", "),
    offset: 0,
    cap: "butt",
    ...marks,
  },
})

const quarterCuts = (
  min: number,
  max: number,
  length: number
): PanelUpdates["cutoffs"] => {
  const at = (t: number) => min + (max - min) * t
  return marksAt([at(0.25), at(0.5), at(0.75)], {
    length,
    width: 4,
    color: token("background"),
  })
}

const markAt = (
  at: number,
  length: number,
  color: ReturnType<typeof token>
): PanelUpdates["cutoffs"] => marksAt([at], { length, width: 3, color })

const BAND_WIDTH = 36
const BAND_MARGIN = 8
const OUTER_BAND_X = 0.75

const spectrumBand = (db: number, x?: number): PanelUpdates => ({
  gauge: {
    shape: "linear",
    orientation: "vertical",
    min: -60,
    max: 0,
    length: 200,
    ...(x === undefined
      ? {}
      : { placement: { position: { x, y: 0 }, scale: 1 } }),
  },
  value: { value: db },
  arcs: { track: { show: false }, arc: { show: false } },
  ticks: {
    fill: {
      show: true,
      count: 20,
      length: BAND_WIDTH,
      litLength: BAND_WIDTH,
      width: 6,
      cap: "butt",
      color: token("foreground"),
      dimColor: token("muted"),
    },
  },
  text: {
    value: { show: false },
    unit: { show: false },
    title: { show: false },
  },
})

const CABIN_TICKS = { length: 6, offset: -34 }
const CABIN_DOT = 5
const CABIN_DOT_CLEARANCE = 12

const SPEED_SWEEP = { startAngle: 40, endAngle: 320 }
const FUEL_GAP = 6

const templates: TemplateSource[] = [
  {
    id: "simple",
    name: "Simple",
    category: "arcs",
    values: {
      value: { value: 62 },
      text: {
        value: { fontSize: 104 },
        unit: { show: false },
        title: { show: false },
      },
    },
  },
  {
    id: "speedometer",
    name: "Speedometer",
    category: "needles",
    values: {
      gauge: { min: 0, max: 240, startAngle: 40, endAngle: 320 },
      value: { value: 128 },
      arcs: { track: { show: false }, arc: { show: false } },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 180, color: token("muted") },
        zone2: { color: token("foreground") },
        band: { width: 8, offset: 0, gap: 0, cap: "butt", endCap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 12,
          length: 18,
          width: 3,
          offset: -16,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 48,
          length: 8,
          width: 1.5,
          offset: -12,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 12,
          offset: -54,
          fontSize: 20,
          weight: "semibold",
          color: token("foreground"),
        },
      },
      needle: {
        show: true,
        needle1: { style: "pointer", length: 0.85, width: 10, tail: 32 },
        hub: { radius: 12 },
      },
      text: {
        value: {
          fontSize: 44,
          font: "mono",
          weight: "semibold",
          position: { x: 0, y: -0.46 },
        },
        unit: {
          show: true,
          text: "km/h",
          fontSize: 18,
          position: { x: 0, y: -0.64 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "internet-speed",
    name: "Internet speed",
    category: "arcs",
    values: {
      gauge: { min: 0, max: 1000, startAngle: 60, endAngle: 300 },
      value: { value: 480 },
      arcs: {
        track: { width: 18 },
        arc: { width: 18, color: token("primary") },
      },
      ticks: {
        minor: {
          show: true,
          count: 40,
          length: 6,
          width: 1.5,
          offset: -34,
          opacity: 0.5,
        },
      },
      text: {
        value: {
          fontSize: 92,
          font: "rounded",
          weight: "bold",
          position: { x: 0, y: 0.04 },
        },
        unit: {
          show: true,
          text: "Mbps",
          fontSize: 24,
          position: { x: 0, y: -0.28 },
        },
        title: {
          show: true,
          text: "Download",
          fontSize: 20,
          position: { x: 0, y: -0.7 },
        },
      },
    },
  },
  {
    id: "saas-metric",
    name: "SaaS metric",
    category: "arcs",
    values: {
      gauge: {
        min: 0,
        max: 100,
        startAngle: 90,
        endAngle: 270,
        fit: "content",
      },
      value: { value: 64 },
      arcs: {
        track: { width: 28 },
        arc: { width: 28, color: token("primary") },
      },
      text: {
        value: {
          fontSize: 84,
          font: "sans",
          weight: "semibold",
          position: { x: 0, y: 0.22 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 28,
          anchor: "start",
          position: { x: 0.27, y: 0.26 },
        },
        title: {
          show: true,
          text: "Conversion rate",
          fontSize: 20,
          position: { x: 0, y: -0.04 },
        },
      },
    },
  },
  {
    id: "sun-path",
    name: "Sun path",
    category: "arcs",
    values: {
      gauge: { min: 6, max: 18, startAngle: 90, endAngle: 270, fit: "content" },
      value: { value: 13.7 },
      arcs: {
        track: { width: 26, color: token("muted-foreground"), opacity: 0.19 },
        arc: { width: 24, color: token("muted-foreground") },
      },
      ticks: {
        major: {
          show: true,
          count: 24,
          length: 2,
          width: 3,
          offset: 0,
          color: token("foreground"),
          opacity: 0.5,
        },
      },
      dot: { show: true, radius: 17.5, color: token("primary") },
      text: {
        value: { show: false },
        unit: {
          show: true,
          text: "06:12 – 18:04",
          fontSize: 19,
          font: "rounded",
          weight: "semibold",
          position: { x: 0, y: 0.1 },
        },
        title: {
          show: true,
          text: "Daylight",
          fontSize: 24,
          font: "rounded",
          weight: "semibold",
          color: token("foreground"),
          position: { x: 0, y: 0.33 },
        },
      },
    },
  },
  {
    id: "temperature",
    name: "Temperature",
    category: "arcs",
    values: {
      gauge: { min: -20, max: 40, startAngle: 40, endAngle: 320 },
      value: { value: 21.5 },
      arcs: {
        track: { width: 16 },
        arc: { width: 16, colorByZone: true },
      },
      cutoffs: {
        show: true,
        count: 3,
        zone1: { to: 10, color: token("muted-foreground") },
        zone2: { to: 26, color: token("primary") },
        zone3: { color: token("foreground") },
        band: {
          width: 6,
          offset: -20,
          gap: 1,
          cap: "butt",
          endCap: "butt",
          opacity: 0.9,
        },
      },
      ticks: {
        minor: {
          show: true,
          count: 60,
          ...CABIN_TICKS,
          width: 1.5,
          opacity: 0.5,
        },
      },
      dot: {
        show: true,
        radius: CABIN_DOT,
        offset:
          CABIN_TICKS.offset -
          CABIN_TICKS.length / 2 -
          CABIN_DOT_CLEARANCE -
          CABIN_DOT,
        color: token("foreground"),
      },
      text: {
        value: { fontSize: 84, decimals: 1 },
        unit: {
          show: true,
          text: "°C",
          fontSize: 28,
          position: { x: 0, y: -0.34 },
        },
        title: {
          show: true,
          text: "Cabin",
          fontSize: 22,
          position: { x: 0, y: 0.36 },
        },
      },
    },
  },
  {
    id: "thermostat",
    name: "Thermostat",
    category: "arcs",
    values: {
      gauge: { min: 10, max: 30, startAngle: 40, endAngle: 320 },
      value: { value: 21.5 },
      arcs: {
        track: { width: 26, cap: "butt" },
        arc: {
          width: 26,
          color: token("foreground"),
          opacity: 0.4,
          cap: "butt",
        },
      },
      ticks: {
        major: {
          show: true,
          count: 80,
          length: 30,
          width: 2.5,
          offset: 0,
          cap: "butt",
          color: token("background"),
          opacity: 1,
        },
      },
      dot: { show: true, radius: 13, color: token("foreground") },
      text: {
        value: {
          fontSize: 88,
          font: "rounded",
          weight: "bold",
          decimals: 1,
          position: { x: 0, y: 0.02 },
        },
        unit: {
          show: true,
          text: "°C",
          fontSize: 24,
          position: { x: 0, y: -0.32 },
        },
        title: {
          show: true,
          text: "Heating",
          fontSize: 20,
          weight: "semibold",
          position: { x: 0, y: 0.4 },
        },
      },
    },
  },
  {
    id: "range",
    name: "Range",
    category: "arcs",
    values: {
      gauge: {
        min: 10,
        max: 30,
        startAngle: 40,
        endAngle: 320,
        control: "ring",
      },
      value: { value: 23, range: true, from: 19, animate: false },
      arcs: {
        track: { width: 28, cap: "butt" },
        arc: {
          width: 28,
          color: token("foreground"),
          opacity: 0.35,
          cap: "butt",
        },
      },
      ticks: {
        major: {
          show: true,
          count: 20,
          length: 8,
          width: 2,
          offset: -38,
          opacity: 0.6,
        },
      },
      dot: {
        show: true,
        ends: "both",
        radius: 16,
        color: token("foreground"),
      },
      text: {
        value: {
          fontSize: 76,
          font: "rounded",
          weight: "bold",
          position: { x: 0, y: 0.02 },
        },
        unit: {
          show: true,
          text: "°C",
          fontSize: 24,
          position: { x: 0, y: -0.3 },
        },
        title: {
          show: true,
          text: "Comfort",
          fontSize: 20,
          weight: "semibold",
          position: { x: 0, y: 0.36 },
        },
      },
    },
  },
  {
    id: "progress-ring",
    name: "Progress ring",
    category: "rings",
    values: {
      gauge: { min: 0, max: 100, startAngle: 0, endAngle: 360 },
      value: { value: 68 },
      arcs: {
        track: { width: 20 },
        arc: { width: 20, color: token("primary") },
      },
      text: {
        value: { fontSize: 84, font: "sans", weight: "semibold" },
        unit: {
          show: true,
          text: "%",
          fontSize: 26,
          position: { x: 0, y: -0.32 },
        },
        title: {
          show: true,
          text: "Complete",
          fontSize: 20,
          position: { x: 0, y: 0.34 },
        },
      },
    },
  },
  {
    id: "segments",
    name: "Segments",
    category: "arcs",
    values: {
      value: { value: 64 },
      arcs: { track: { show: false }, arc: { show: false } },
      ticks: {
        fill: {
          show: true,
          count: 40,
          length: 28,
          litLength: 40,
          width: 7,
          color: token("foreground"),
          dimColor: token("muted"),
        },
      },
      text: {
        value: { fontSize: 104, font: "rounded", weight: "bold" },
        unit: {
          show: true,
          text: "%",
          fontSize: 26,
          position: { x: 0, y: -0.34 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "data-usage",
    name: "Data usage",
    category: "arcs",
    values: {
      gauge: { min: 0, max: 50, startAngle: 60, endAngle: 300 },
      value: { value: 32 },
      arcs: {
        track: { width: 28 },
        arc: { width: 28, color: token("foreground") },
      },
      dot: { show: true, radius: 7, color: token("background") },
      tooltip: {
        show: true,
        label: "Used",
        unit: "GB",
        decimals: 1,
        position: "value",
      },
      text: {
        value: {
          fontSize: 96,
          font: "rounded",
          weight: "bold",
          position: { x: -0.08, y: 0.06 },
        },
        unit: {
          show: true,
          text: "GB",
          fontSize: 32,
          font: "rounded",
          weight: "bold",
          anchor: "start",
          position: { x: 0.2, y: 0.02 },
        },
        title: {
          show: true,
          text: "of 50 GB",
          fontSize: 26,
          position: { x: 0, y: -0.26 },
        },
      },
    },
  },
  {
    id: "dimmer",
    name: "Dimmer",
    category: "arcs",
    values: {
      gauge: { min: 0, max: 100, startAngle: 40, endAngle: 320 },
      value: { value: 68 },
      arcs: {
        track: { width: 40, color: token("foreground"), opacity: 0.1 },
        arc: { width: 40, color: token("foreground") },
      },
      dot: { show: true, radius: 9, color: token("background") },
      text: {
        value: {
          fontSize: 84,
          font: "rounded",
          weight: "bold",
          position: { x: -0.07, y: 0 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 30,
          font: "rounded",
          weight: "bold",
          anchor: "start",
          position: { x: 0.22, y: 0.04 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "volume",
    name: "Volume",
    category: "arcs",
    values: {
      gauge: {
        min: 0,
        max: 100,
        startAngle: 40,
        endAngle: 320,
        control: "knob",
      },
      value: {
        value: 42,
        motion: { type: "spring", visualDuration: 0.3, bounce: 0 },
      },
      arcs: {
        track: {
          width: 6,
          offset: -18,
          color: token("foreground"),
          opacity: 0.12,
        },
        arc: { width: 6, offset: -18, color: token("foreground") },
        face: { show: true, radius: 156, color: token("muted") },
      },
      ticks: {
        major: {
          show: true,
          count: 20,
          length: 12,
          width: 3,
          offset: 6,
          cap: "round",
          color: token("muted-foreground"),
          opacity: 0.45,
        },
      },
      dot: { show: true, radius: 11, offset: -76, color: token("foreground") },
      text: {
        value: { fontSize: 64, font: "rounded", weight: "bold" },
        unit: { show: false },
        title: { show: false },
      },
    },
  },
  {
    id: "analog-dial",
    name: "Analog dial",
    category: "needles",
    values: {
      gauge: { min: 0, max: 100, startAngle: 45, endAngle: 315 },
      value: { value: 58 },
      arcs: { track: { show: false }, arc: { show: false } },
      ticks: {
        major: {
          show: true,
          count: 10,
          length: 20,
          width: 2.5,
          offset: -10,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 50,
          length: 10,
          width: 1.5,
          offset: -5,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 10,
          offset: -46,
          fontSize: 18,
          font: "mono",
          weight: "regular",
        },
      },
      needle: {
        show: true,
        needle1: { style: "line", length: 0.86, width: 4, tail: 40 },
        hub: { radius: 10 },
      },
      text: {
        value: {
          fontSize: 40,
          font: "mono",
          weight: "regular",
          position: { x: 0, y: -0.48 },
        },
        unit: {
          show: true,
          text: "psi",
          fontSize: 18,
          font: "mono",
          position: { x: 0, y: -0.66 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "compass",
    name: "Compass",
    category: "needles",
    values: {
      gauge: { min: 0, max: 360, startAngle: 180, endAngle: 540 },
      value: { value: 128 },
      arcs: {
        track: { width: 2, color: token("muted-foreground"), opacity: 0.4 },
        arc: { show: false },
      },
      ticks: {
        major: {
          show: true,
          count: 8,
          length: 18,
          width: 3,
          offset: -9,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 36,
          length: 8,
          width: 1.5,
          offset: -4,
          cap: "butt",
          opacity: 0.8,
        },
        labels: {
          show: true,
          count: 8,
          offset: -46,
          fontSize: 22,
          weight: "bold",
          color: token("foreground"),
          format: "compass",
        },
      },
      needle: {
        show: true,
        needle1: {
          style: "compass",
          length: 0.62,
          width: 22,
          tail: 124,
          color: token("foreground"),
          tailColor: token("muted-foreground"),
        },
        hub: { radius: 5, color: token("background") },
      },
      text: {
        value: { show: false },
        unit: { show: false },
        title: { show: false },
      },
    },
  },
  {
    id: "wind",
    name: "Wind direction",
    category: "needles",
    values: {
      gauge: { min: 0, max: 360, startAngle: 180, endAngle: 540 },
      value: { value: 196 },
      arcs: { track: { cap: "butt" }, arc: { show: false } },
      ticks: {
        major: { show: true, count: 4, length: 8, offset: 0 },
        minor: { show: true, count: 36, length: 4, width: 3, offset: 0 },
        labels: {
          show: true,
          count: 4,
          offset: -44,
          fontSize: 32,
          font: "rounded",
          weight: "bold",
          format: "compass",
        },
      },
      needle: {
        show: true,
        needle1: {
          style: "arrow",
          length: 1.05,
          width: 7,
          tail: 200,
          tailDot: 12,
          gap: 84,
        },
        hub: { radius: 0 },
      },
      text: {
        value: { show: false },
        title: {
          show: true,
          text: "5",
          position: { x: 0, y: 0.07 },
          fontSize: 72,
          color: token("foreground"),
          font: "rounded",
          weight: "bold",
        },
        unit: {
          show: true,
          text: "m/s",
          position: { x: 0, y: -0.16 },
          fontSize: 26,
          color: token("muted-foreground"),
          font: "rounded",
          weight: "medium",
        },
      },
    },
  },
  {
    id: "clock",
    name: "Clock",
    category: "needles",
    values: {
      gauge: { min: 0, max: 12, startAngle: 180, endAngle: 540 },
      value: { value: 10.2 },
      arcs: { track: { show: false }, arc: { show: false } },
      ticks: {
        major: {
          show: true,
          count: 12,
          length: 16,
          width: 3,
          offset: -8,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 60,
          length: 6,
          width: 1.5,
          offset: -3,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 12,
          offset: -48,
          fontSize: 26,
          weight: "semibold",
          color: token("foreground"),
          format: "clock",
        },
      },
      needle: {
        show: true,
        count: 2,
        needle1: { style: "pointer", length: 0.5, width: 12, tail: 0 },
        needle2: {
          style: "pointer",
          length: 0.74,
          width: 8,
          tail: 0,
          turns: 12,
        },
        hub: { radius: 7 },
      },
      text: {
        value: { show: false },
        unit: { show: false },
        title: { show: false },
      },
    },
  },
  {
    id: "activity-ring",
    name: "Activity ring",
    category: "rings",
    values: {
      gauge: { min: 0, max: 600, startAngle: 180, endAngle: 540 },
      value: { value: 420 },
      arcs: {
        track: { width: 44, color: token("foreground"), opacity: 0.12 },
        arc: { width: 44, color: token("foreground") },
      },
      text: {
        value: {
          fontSize: 80,
          font: "rounded",
          weight: "bold",
          position: { x: 0, y: 0.06 },
        },
        unit: {
          show: true,
          text: "kcal",
          fontSize: 24,
          font: "rounded",
          position: { x: 0, y: -0.3 },
        },
        title: {
          show: true,
          text: "Move",
          fontSize: 22,
          font: "rounded",
          weight: "semibold",
          color: token("foreground"),
          position: { x: 0, y: 0.4 },
        },
      },
    },
  },
  {
    id: "fuel",
    name: "Fuel",
    category: "needles",
    values: {
      gauge: { min: 0, max: 100, startAngle: 90, endAngle: 270 },
      value: { value: 38 },
      arcs: { track: { show: false }, arc: { show: false } },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 12, color: token("foreground") },
        zone2: { color: token("muted") },
        band: { width: 10, offset: 0, gap: 0, cap: "butt", endCap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 4,
          length: 18,
          width: 3,
          offset: -20,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 16,
          length: 8,
          width: 1.5,
          offset: -15,
          cap: "butt",
          opacity: 0.5,
        },
      },
      needle: {
        show: true,
        needle1: { style: "pointer", length: 0.85, width: 9, tail: 24 },
        hub: { radius: 10 },
      },
      text: {
        value: {
          fontSize: 36,
          font: "mono",
          weight: "semibold",
          position: { x: 0, y: -0.42 },
        },
        unit: {
          show: true,
          text: "F",
          fontSize: 28,
          weight: "bold",
          color: token("foreground"),
          position: { x: 0.8, y: -0.16 },
        },
        title: {
          show: true,
          text: "E",
          fontSize: 28,
          weight: "bold",
          color: token("foreground"),
          position: { x: -0.8, y: -0.16 },
        },
      },
    },
  },
  {
    id: "battery",
    name: "Battery",
    category: "rings",
    values: {
      gauge: { min: 0, max: 100, startAngle: 180, endAngle: 540 },
      value: { value: 64 },
      arcs: {
        track: { width: 30, cap: "butt" },
        arc: { width: 30, color: token("foreground"), cap: "butt" },
      },
      cutoffs: marksAt([80], {
        length: 46,
        width: 5,
        color: token("foreground"),
      }),
      text: {
        value: {
          fontSize: 92,
          font: "rounded",
          weight: "bold",
          position: { x: -0.06, y: 0.02 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 30,
          anchor: "start",
          position: { x: 0.24, y: 0.06 },
        },
        title: {
          show: true,
          text: "307 km",
          fontSize: 22,
          position: { x: 0, y: -0.36 },
        },
      },
    },
  },
  {
    id: "tachometer",
    name: "Tachometer",
    category: "needles",
    values: {
      gauge: { min: 0, max: 8, startAngle: 40, endAngle: 320 },
      value: { value: 5.2 },
      arcs: { track: { show: false }, arc: { show: false } },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 6.5, color: token("muted") },
        zone2: { color: token("foreground") },
        band: { width: 10, offset: 4, gap: 0, cap: "butt", endCap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 8,
          length: 18,
          width: 3,
          offset: -16,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 40,
          length: 8,
          width: 1.5,
          offset: -12,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 8,
          offset: -52,
          fontSize: 24,
          weight: "bold",
          color: token("foreground"),
        },
      },
      needle: {
        show: true,
        needle1: { style: "pointer", length: 0.88, width: 10, tail: 30 },
        hub: { radius: 12 },
      },
      text: {
        value: {
          fontSize: 44,
          font: "mono",
          weight: "semibold",
          decimals: 1,
          position: { x: 0, y: -0.46 },
        },
        unit: {
          show: true,
          text: "x1000 rpm",
          fontSize: 16,
          position: { x: 0, y: -0.64 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "power-meter",
    name: "Power meter",
    category: "needles",
    values: {
      gauge: {
        min: -10,
        max: 10,
        startAngle: 90,
        endAngle: 270,
        fit: "content",
      },
      value: { value: 2.4 },
      arcs: {
        track: { width: 20, cap: "butt" },
        arc: { show: false },
      },
      ticks: {
        major: {
          show: true,
          count: 4,
          length: 14,
          width: 3,
          offset: -24,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 20,
          length: 8,
          width: 2,
          offset: -20,
          opacity: 0.5,
        },
        labels: {
          show: true,
          count: 4,
          offset: -56,
          fontSize: 22,
          weight: "semibold",
        },
      },
      needle: {
        show: true,
        needle1: { style: "pointer", length: 0.9, width: 18, tail: 0 },
        hub: { radius: 16 },
      },
      text: {
        value: { show: false },
        unit: {
          show: true,
          text: "kW in",
          fontSize: 20,
          position: { x: 0.42, y: 0.16 },
        },
        title: {
          show: true,
          text: "kW out",
          fontSize: 20,
          position: { x: -0.42, y: 0.16 },
        },
      },
    },
  },
  {
    id: "air-quality",
    name: "Air quality",
    category: "arcs",
    values: {
      gauge: {
        min: 0,
        max: 500,
        startAngle: 90,
        endAngle: 270,
        fit: "content",
      },
      value: { value: 42 },
      arcs: {
        track: { width: 20 },
        arc: { width: 20, color: token("foreground") },
      },
      cutoffs: {
        show: true,
        count: 3,
        zone1: { to: 50, color: token("muted") },
        zone2: { to: 100, color: token("muted-foreground") },
        zone3: { color: token("foreground") },
        band: { width: 6, offset: -22, gap: 2, cap: "butt", endCap: "round" },
        marks: { show: true, length: 10, width: 2, offset: -22 },
      },
      text: {
        value: {
          fontSize: 84,
          font: "rounded",
          weight: "bold",
          position: { x: 0, y: 0.22 },
        },
        unit: {
          show: true,
          text: "AQI",
          fontSize: 24,
          position: { x: 0, y: -0.08 },
        },
        title: {
          show: true,
          text: "Air quality",
          fontSize: 20,
          position: { x: 0, y: 0.62 },
        },
      },
    },
  },
  {
    id: "heart-rate",
    name: "Heart rate",
    category: "arcs",
    values: {
      gauge: { min: 40, max: 200, startAngle: 60, endAngle: 300 },
      value: { value: 128 },
      arcs: {
        track: { width: 14 },
        arc: { width: 14, colorByZone: true },
      },
      cutoffs: {
        show: true,
        count: 3,
        zone1: { to: 100, color: token("muted-foreground") },
        zone2: { to: 160, color: token("primary") },
        zone3: { color: token("foreground") },
        band: { width: 4, offset: -18, gap: 1.5, cap: "butt", endCap: "round" },
      },
      text: {
        value: { fontSize: 96, font: "rounded", weight: "bold" },
        unit: {
          show: true,
          text: "bpm",
          fontSize: 28,
          position: { x: 0, y: -0.34 },
        },
        title: {
          show: true,
          text: "Heart rate",
          fontSize: 22,
          position: { x: 0, y: 0.36 },
        },
      },
    },
  },
  {
    id: "timer",
    name: "Timer",
    category: "rings",
    values: {
      gauge: { min: 0, max: 60, startAngle: 180, endAngle: 540 },
      value: { value: 42 },
      arcs: {
        track: { width: 8, cap: "butt" },
        arc: { width: 8, color: token("foreground"), cap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 12,
          length: 10,
          width: 2.5,
          offset: 18,
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 60,
          length: 5,
          width: 1.5,
          offset: 16,
          opacity: 0.5,
        },
      },
      text: {
        value: {
          fontSize: 110,
          font: "mono",
          weight: "regular",
          position: { x: 0, y: 0.04 },
        },
        unit: {
          show: true,
          text: "sec",
          fontSize: 24,
          font: "mono",
          position: { x: 0, y: -0.3 },
        },
        title: { show: false },
      },
    },
  },
  {
    id: "chronograph",
    name: "Chronograph",
    values: {
      gauge: { min: 0, max: 60, startAngle: 180, endAngle: 540 },
      value: { value: 42 },
      arcs: { track: { show: false }, arc: { show: false } },
      ticks: {
        major: {
          show: true,
          count: 12,
          length: 22,
          width: 4,
          offset: -11,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 60,
          length: 14,
          width: 2.5,
          offset: -7,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 12,
          offset: -50,
          fontSize: 26,
          weight: "semibold",
          color: token("foreground"),
        },
      },
      needle: {
        show: true,
        needle1: {
          style: "line",
          length: 0.92,
          width: 4,
          tail: 44,
          tailDot: 10,
        },
        hub: { radius: 11 },
      },
      text: {
        value: { show: false },
        unit: { show: false },
        title: {
          show: true,
          text: "05:42.1",
          fontSize: 30,
          font: "mono",
          position: { x: 0, y: 0.36 },
        },
      },
    },
    insets: [
      {
        name: "minutes",
        values: {
          gauge: {
            min: 0,
            max: 30,
            startAngle: 180,
            endAngle: 540,
            placement: { position: { x: 0, y: -0.36 }, scale: 0.28 },
          },
          value: { value: 5.7 },
          arcs: {
            track: { width: 6, cap: "butt", opacity: 0.25, offset: -3 },
            arc: { show: false },
          },
          ticks: {
            major: {
              show: true,
              count: 6,
              length: 34,
              width: 9,
              offset: -26,
              cap: "butt",
              color: token("foreground"),
            },
            minor: {
              show: true,
              count: 30,
              length: 18,
              width: 5,
              offset: -18,
              cap: "butt",
              opacity: 0.5,
            },
          },
          needle: {
            show: true,
            needle1: { style: "pointer", length: 0.78, width: 30, tail: 0 },
            hub: { radius: 22 },
          },
          text: { value: { show: false }, unit: { show: false } },
        },
      },
    ],
  },
  {
    id: "speed-fuel",
    name: "Speed & fuel",
    values: {
      gauge: { min: 0, max: 240, ...SPEED_SWEEP },
      value: { value: 128 },
      arcs: { track: { show: false }, arc: { show: false } },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 180, color: token("muted") },
        zone2: { color: token("foreground") },
        band: { width: 8, offset: 0, gap: 0, cap: "butt", endCap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 12,
          length: 18,
          width: 3,
          offset: -16,
          cap: "butt",
          color: token("foreground"),
        },
        minor: {
          show: true,
          count: 48,
          length: 8,
          width: 1.5,
          offset: -12,
          cap: "butt",
          opacity: 0.6,
        },
        labels: {
          show: true,
          count: 12,
          offset: -54,
          fontSize: 20,
          weight: "semibold",
          color: token("foreground"),
        },
      },
      needle: {
        show: true,
        needle1: { style: "pointer", length: 0.85, width: 10, tail: 32 },
        hub: { radius: 12 },
      },
      text: {
        value: {
          fontSize: 40,
          font: "mono",
          weight: "semibold",
          position: { x: 0, y: -0.28 },
        },
        unit: {
          show: true,
          text: "km/h",
          fontSize: 16,
          position: { x: 0, y: -0.44 },
        },
        title: { show: false },
      },
    },
    insets: [
      {
        name: "fuel",
        values: {
          gauge: {
            min: 0,
            max: 100,
            startAngle: SPEED_SWEEP.endAngle + FUEL_GAP,
            endAngle: SPEED_SWEEP.startAngle + 360 - FUEL_GAP,
            placement: { position: { x: 0, y: 0 }, scale: 1 },
          },
          value: { value: 38 },
          arcs: {
            track: {
              width: 8,
              color: token("muted"),
              cap: "butt",
              offset: 0,
            },
            arc: {
              width: 8,
              color: token("muted-foreground"),
              cap: "butt",
              offset: 0,
              reverse: true,
            },
          },
          ticks: {
            major: {
              show: true,
              count: 4,
              length: 10,
              width: 2,
              offset: -12,
              cap: "butt",
              color: token("muted-foreground"),
            },
          },
          text: {
            value: { show: false },
            unit: {
              show: true,
              text: "E",
              fontSize: 20,
              weight: "semibold",
              position: { x: -0.64, y: -0.94 },
            },
            title: {
              show: true,
              text: "F",
              fontSize: 20,
              weight: "semibold",
              position: { x: 0.64, y: -0.94 },
            },
          },
        },
      },
    ],
  },
  {
    id: "nested-rings",
    name: "Nested rings",
    values: {
      gauge: { min: 0, max: 100, startAngle: 180, endAngle: 540 },
      value: { value: 72 },
      arcs: {
        track: { width: 44, color: token("foreground"), opacity: 0.12 },
        arc: { width: 44, color: token("foreground") },
      },
      text: {
        value: {
          fontSize: 52,
          font: "rounded",
          weight: "bold",
          position: { x: 0, y: 0.08 },
        },
        unit: { show: false },
        title: {
          show: true,
          text: "Move",
          fontSize: 20,
          font: "rounded",
          weight: "semibold",
          position: { x: 0, y: -0.12 },
        },
      },
    },
    insets: [
      {
        name: "exercise",
        values: {
          gauge: {
            min: 0,
            max: 100,
            startAngle: 180,
            endAngle: 540,
            placement: { position: { x: 0, y: 0 }, scale: 0.74 },
          },
          value: { value: 48 },
          arcs: {
            track: { width: 60, color: token("foreground"), opacity: 0.1 },
            arc: { width: 60, color: token("foreground"), opacity: 0.62 },
          },
          text: { value: { show: false }, unit: { show: false } },
        },
      },
      {
        name: "stand",
        values: {
          gauge: {
            min: 0,
            max: 100,
            startAngle: 180,
            endAngle: 540,
            placement: { position: { x: 0, y: 0 }, scale: 0.5 },
          },
          value: { value: 90 },
          arcs: {
            track: { width: 76, color: token("foreground"), opacity: 0.1 },
            arc: { width: 76, color: token("foreground"), opacity: 0.34 },
          },
          text: { value: { show: false }, unit: { show: false } },
        },
      },
    ],
  },
  {
    id: "sprint",
    name: "Sprint",
    values: {
      gauge: { min: 0, max: 100, startAngle: 180, endAngle: 540 },
      value: { value: 0 },
      arcs: { track: { show: false }, arc: { show: false } },
      text: { value: { show: false }, unit: { show: false } },
    },
    insets: [
      { name: "design", values: sprintRing(-0.5, 0.5, 85, "Design", 17, 20) },
      { name: "qa", values: sprintRing(0.5, 0.5, 12, "QA", 3, 25) },
      {
        name: "frontend",
        values: sprintRing(-0.5, -0.5, 62, "Frontend", 13, 21),
      },
      {
        name: "backend",
        values: sprintRing(0.5, -0.5, 38, "Backend", 9, 24),
      },
    ],
  },
  {
    id: "system",
    name: "System",
    values: {
      gauge: { min: 0, max: 100, startAngle: 90, endAngle: 270 },
      value: { value: 64 },
      arcs: {
        track: { width: 26 },
        arc: { width: 26, color: token("primary") },
      },
      text: {
        value: {
          fontSize: 76,
          font: "rounded",
          weight: "bold",
          position: { x: -0.06, y: 0.3 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 26,
          anchor: "start",
          position: { x: 0.19, y: 0.34 },
        },
        title: {
          show: true,
          text: "CPU",
          fontSize: 22,
          position: { x: 0, y: 0.62 },
        },
      },
    },
    insets: [
      {
        name: "mem",
        values: insetHalfDial(-0.5, 61, "MEM", token("foreground")),
      },
      {
        name: "disk",
        values: insetHalfDial(0.5, 38, "DISK", token("muted-foreground")),
      },
    ],
  },
  {
    id: "orrery",
    name: "Orrery",
    values: {
      ...planetOrbit(0, 65, 7),
      needle: {
        show: true,
        count: 0,
        hub: { radius: 24, color: token("foreground") },
      },
      text: {
        value: { show: false },
        unit: { show: false },
        title: { show: false },
      },
    },
    insets: [
      { name: "earth", values: planetOrbit(-40, 200, 9, true) },
      { name: "venus", values: planetOrbit(-80, 300, 8.5, true) },
      { name: "mercury", values: planetOrbit(-120, 130, 6, true) },
    ],
  },
  {
    id: "throttle",
    name: "Throttle",
    values: {
      gauge: { shape: "linear", min: 0, max: 100, padding: 64, ends: 28 },
      value: { value: 72 },
      arcs: {
        track: { width: 28, cap: "butt" },
        arc: { width: 28, cap: "butt", color: token("foreground") },
      },
      cutoffs: quarterCuts(0, 100, 28),
      ticks: {
        labels: { show: true, count: 4, offset: -36, fontSize: 16 },
      },
      text: {
        value: {
          fontSize: 32,
          font: "sans",
          anchor: "end",
          position: { x: 0.89, y: 0.22 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 22,
          anchor: "end",
          position: { x: 1, y: 0.205 },
        },
        title: {
          show: true,
          text: "Throttle",
          fontSize: 22,
          anchor: "start",
          position: { x: -1, y: 0.22 },
        },
      },
    },
  },
  {
    id: "tank",
    name: "Tank",
    values: {
      gauge: {
        shape: "linear",
        orientation: "vertical",
        min: 0,
        max: 100,
        length: 320,
        padding: 44,
        ends: 60,
      },
      value: { value: 64 },
      arcs: {
        track: { width: 64, cap: "butt" },
        arc: { width: 64, cap: "butt", color: token("foreground") },
      },
      cutoffs: quarterCuts(0, 100, 64),
      text: {
        value: {
          fontSize: 36,
          font: "sans",
          position: { x: -0.06, y: -0.98 },
        },
        unit: {
          show: true,
          text: "%",
          fontSize: 22,
          anchor: "start",
          position: { x: 0.08, y: -0.99 },
        },
        title: {
          show: true,
          text: "Water",
          fontSize: 22,
          position: { x: 0, y: 0.98 },
        },
      },
    },
  },
  {
    id: "rev-tape",
    name: "Rev tape",
    values: {
      gauge: { shape: "linear", min: 4, max: 12, padding: 72, ends: 16 },
      value: { value: 9.4 },
      arcs: {
        track: { width: 16, cap: "butt" },
        arc: { width: 16, cap: "butt", color: token("foreground") },
      },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 11, color: token(NO_PAINT) },
        zone2: { color: token("foreground") },
        band: { width: 5, offset: 18, gap: 0, cap: "butt", endCap: "butt" },
      },
      ticks: {
        major: {
          show: true,
          count: 8,
          length: 10,
          width: 2,
          offset: -18,
          cap: "butt",
        },
        minor: {
          show: true,
          count: 32,
          length: 5,
          width: 1.5,
          offset: -15.5,
          cap: "butt",
        },
        labels: { show: true, count: 4, offset: -42, fontSize: 16 },
      },
      text: {
        value: {
          fontSize: 40,
          font: "mono",
          decimals: 1,
          anchor: "start",
          position: { x: -1, y: 0.27 },
        },
        unit: { show: false },
        title: {
          show: true,
          text: "RPM ×1000",
          fontSize: 18,
          anchor: "end",
          position: { x: 1, y: 0.24 },
        },
      },
    },
  },
  {
    id: "shift-lights",
    name: "Shift lights",
    values: {
      gauge: { shape: "linear", min: 9, max: 12, padding: 24, ends: 16 },
      value: { value: 11.1 },
      arcs: { track: { show: false }, arc: { show: false } },
      ticks: {
        fill: {
          show: true,
          count: 14,
          length: 0,
          litLength: 0,
          width: 22,
          color: token("foreground"),
          dimColor: token("muted"),
        },
      },
      text: {
        value: { show: false },
        unit: { show: false },
        title: { show: false },
      },
    },
  },
  {
    id: "delta",
    name: "Delta",
    values: {
      gauge: { shape: "linear", min: -1, max: 1, padding: 64, ends: 28 },
      value: { value: -0.32 },
      arcs: {
        track: { width: 20, cap: "butt" },
        arc: {
          width: 20,
          cap: "butt",
          color: token("foreground"),
          fromZero: true,
        },
      },
      cutoffs: markAt(0, 36, token("foreground")),
      ticks: {
        labels: {
          show: true,
          count: 2,
          offset: -38,
          fontSize: 16,
          decimals: 1,
        },
      },
      text: {
        value: {
          fontSize: 36,
          font: "mono",
          decimals: 2,
          position: { x: 0, y: 0.24 },
        },
        unit: { show: false },
        title: {
          show: true,
          text: "Delta",
          fontSize: 18,
          anchor: "start",
          position: { x: -1, y: 0.22 },
        },
      },
    },
  },
  {
    id: "equaliser",
    name: "Equaliser",
    values: {
      ...spectrumBand(-26),
      gauge: {
        ...spectrumBand(-26).gauge,
        padding: OUTER_BAND_X * RADIUS + BAND_WIDTH / 2 + BAND_MARGIN,
        ends: BAND_MARGIN,
      },
    },
    insets: [
      { name: "sub", values: spectrumBand(-22, -OUTER_BAND_X) },
      { name: "bass", values: spectrumBand(-14, -0.5) },
      { name: "lowMid", values: spectrumBand(-20, -0.25) },
      { name: "highMid", values: spectrumBand(-31, 0.25) },
      { name: "presence", values: spectrumBand(-38, 0.5) },
      { name: "air", values: spectrumBand(-46, OUTER_BAND_X) },
    ],
  },
  {
    id: "eq-fader",
    name: "EQ fader",
    values: {
      gauge: {
        shape: "linear",
        orientation: "vertical",
        min: -12,
        max: 12,
        length: 320,
        padding: 84,
        ends: 60,
        control: "ring",
      },
      value: { value: 4 },
      arcs: {
        track: { width: 6 },
        arc: {
          width: 6,
          cap: "butt",
          color: token("foreground"),
          fromZero: true,
        },
      },
      cutoffs: markAt(0, 28, token("muted-foreground")),
      ticks: {
        major: {
          show: true,
          count: 8,
          length: 8,
          width: 2,
          offset: 30,
          opacity: 0.5,
        },
        labels: { show: true, count: 4, offset: 60, fontSize: 16 },
      },
      dot: { show: true, radius: 14, color: token("foreground") },
      text: {
        value: {
          fontSize: 32,
          font: "sans",
          decimals: 1,
          position: { x: -0.08, y: -0.98 },
        },
        unit: {
          show: true,
          text: "dB",
          fontSize: 20,
          anchor: "start",
          position: { x: 0.1, y: -0.99 },
        },
        title: {
          show: true,
          text: "1 kHz",
          fontSize: 20,
          position: { x: 0, y: 0.98 },
        },
      },
    },
  },
]

const shelved = templates.map((template) => ({
  ...template,
  category: categoryOf(template),
}))

export const gaugeTemplates: GaugeTemplate[] = templateCategories.flatMap(
  ({ id }) => shelved.filter((template) => template.category === id)
)

export const templateComposition = (
  template: GaugeTemplate | null
): Composition => ({
  host: hostLayer(
    template ? resolvePanelValues(template.values) : defaultPanelValues()
  ),
  insets: (template?.insets ?? []).map((inset) => ({
    id: inset.name,
    name: layerName(inset.name),
    values: resolvePanelValues(inset.values),
  })),
})

export const templatePreview = (template: GaugeTemplate) => {
  const composition = templateComposition(template)
  return {
    spec: specOf(composition),
    value: composition.host.values.value.value,
  }
}
