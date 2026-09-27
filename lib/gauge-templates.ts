/**
 * Starting points for the studio. Each template is a partial update over the
 * panel defaults, in the shape the panel controllers accept, so applying one
 * is "reset, then set". The same updates drive the picker's mini previews.
 *
 * Templates stay within the greyscale theme tokens so they follow light and
 * dark mode; the fixed accents in the palette are left for the user to add.
 * None of them set `padding`, so every preview keeps the panel default and the
 * dials sit in the same frame as each other.
 *
 * A template can also carry `insets`: further gauges, described the same way,
 * drawn inside the first one. They are placed in the host gauge's coordinate
 * space and scaled as a whole, so an inset is simply a smaller dial.
 */

import {
  defaultPanelValues,
  resolvePanelValues,
  type PanelUpdates,
} from "@/lib/gauge-panels"
import {
  hostLayer,
  layerName,
  specFromLayers,
  type GaugeLayer,
} from "@/lib/gauge-layers"

/**
 * A whole second gauge drawn inside the template's own, described the same
 * way: a set of panel updates over the defaults. Where it sits and how big it
 * is drawn are `gauge.placement`, the same control an inset's own Gauge panel
 * shows, so a template says nothing the studio cannot say back.
 */
export type TemplateInset = {
  /** Prop name in the generated code. A plain identifier, such as `fuel`. */
  name: string
  values: PanelUpdates
}

export type GaugeTemplate = {
  id: string
  name: string
  values: PanelUpdates
  insets?: TemplateInset[]
}

const token = (name: string) => ({ token: name })

/** The small half dials under the System template's own, bar their labels. */
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

/**
 * One planet on its orbit, for the Orrery. The track is the orbit itself,
 * pulled in from the gauge's radius by `offset` rather than scaled down, so
 * every ring stays the same hairline and every planet the same size however
 * far in it sits. The arc is the stretch of orbit covered so far and the dot
 * rides its head, which makes the layer's value the planet's position: drag
 * it or sweep it and the planet goes round, trailing its path behind it.
 */
const planetOrbit = (
  /** How far in from the gauge's radius the orbit sits. */
  offset: number,
  /** Where the planet has got to, in degrees round the orbit. */
  at: number,
  /** The planet's radius. */
  size: number,
  /** Insets need placing; the outermost orbit is the gauge itself. */
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

export const gaugeTemplates: GaugeTemplate[] = [
  {
    id: "simple",
    name: "Simple",
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
    /* The sun's arc across a day, drawn the way the sky is: a half circle
       standing on the horizon, sunrise at the left and sunset at the right.
       `fit: "content"` trims the box to that sweep, so the flat bottom edge
       reads as the horizon rather than leaving a blank lower half.

       The domain is the hour of the day, 6 to 18, and there are no hands and
       no numbering: the dot rides the head of the arc, which makes it the sun
       itself, and it takes the accent so it stays the one thing to look for.
       The arc behind it keeps the track's colour at full strength, so the
       daylight already spent reads as shade rather than a second mark. The
       ticks are stubs barely longer than they are wide, one every half hour, so
       they read as a rule printed along the band rather than a scale, and the
       two times in the middle are what the band's ends stand for. */
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
          length: 6,
          width: 1.5,
          offset: -34,
          opacity: 0.5,
        },
      },
      /* A second reading of the value, inside the ticks: the arc says it in
         the round and this says it to the degree. The ticks reach in to 163,
         so a dot of 5 sitting at 146 leaves 12 clear of them. It keeps one
         colour while the arc takes the zone's, so the mark stays the same
         thing to look for wherever the temperature has got to. */
      dot: { show: true, radius: 5, offset: -54, color: token("foreground") },
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
    /* The smart home's thermostat: a broad band sliced into segments by a
       ribbon of ticks drawn in the stage's colour, filled to the setpoint,
       with the dot as the handle a drag would turn. The ticks are longer than
       the band is wide, so they cut it clean through at either edge. */
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
    id: "progress-ring",
    name: "Progress ring",
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
    id: "dimmer",
    name: "Dimmer",
    /* A light's dimmer: the brightness fills a broad sweep, and the notch at
       its head — a dot in the stage's colour — is the grip a finger would
       find. */
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
    id: "analog-dial",
    name: "Analog dial",
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
    /* A masthead wind indicator: the arrowhead points at the bearing the wind
       blows from, and its tail runs out to a disc on the far rim, like a vane's
       counterweight. The arrow spans the whole dial and crosses the broad
       rim at both ends. Instead of a hub it is split round the centre, where
       a fixed wind speed sits between the halves. Round ticks every 10°,
       heavier at the cardinal points, which are labelled. */
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
      /* The value is the bearing, so the wind speed in the middle is fixed
         text: the figure in the title, the unit under it. */
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
    /* An EV charging: the charge fills the ring and the charge limit is a
       notch across the band. The notch is the cutoff between two zones in the
       track's own colour, with the band's opacity at zero so only its mark
       draws. */
    values: {
      gauge: { min: 0, max: 100, startAngle: 180, endAngle: 540 },
      value: { value: 64 },
      arcs: {
        track: { width: 30, cap: "butt" },
        arc: { width: 30, color: token("foreground"), cap: "butt" },
      },
      cutoffs: {
        show: true,
        count: 2,
        zone1: { to: 80, color: token("muted") },
        zone2: { color: token("muted") },
        band: {
          width: 30,
          offset: 0,
          gap: 0,
          cap: "butt",
          endCap: "butt",
          opacity: 0,
        },
        marks: {
          show: true,
          length: 46,
          width: 5,
          offset: 0,
          cap: "butt",
          color: token("foreground"),
        },
      },
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
    /* The house's grid connection: a half dial centred on zero, the needle
       leaning left while power flows out to the grid and right while the
       house draws it in. The words either side of the hub name the two
       directions, since the value itself carries the sign. */
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
    /* A mechanical stopwatch: sixty seconds round the rim under a sweep hand
       with a counterweight dot, the split printed above the centre, and a
       thirty-minute register inset above six o'clock. The register is a whole
       second dial, so it is an inset with its own hand to drive. */
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
      /* The readout sits just under the hub, clear of the needle's tail, with
         the unit under the number and both on the dial's centre line. */
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
    /* Fuel closes the speedometer's ring: same centre, same radius, filling
       the opening left between 320 and 400 — the 40 the speed sweep started
       at — with a few degrees clear at either end so the two arcs never
       touch. The sweep runs clockwise, which at the foot of a dial is right
       to left, so the fill is reversed to sit the empty end on the left and
       read E to F the way a fuel gauge does. */
    insets: [
      {
        name: "fuel",
        values: {
          gauge: {
            min: 0,
            max: 100,
            startAngle: 326,
            endAngle: 394,
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
    /* Three rings of the same thickness. Scaling shrinks the stroke along with
       the radius, so each inner ring's width is set back up by its own scale:
       60 x 0.74 and 76 x 0.5 both land near the host's 44. They step down in
       weight rather than in colour, which keeps them apart in either theme. */
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
    /* Two more half dials in the empty lower half, one either side. */
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
    /* Four orbits round one Sun, evenly spaced, each running a whole turn
       from twelve o'clock. Every layer is a planet, so driving one sends that
       planet round its own orbit; sweep it to watch a year go by.

       The Sun is the hub, which only draws alongside a needle, so the needle
       is a stub shorter than the hub's radius and never shows. The outermost
       orbit is the gauge itself; the other three are insets sharing its
       centre at full size, set apart by how far each ring is offset inwards. */
    values: {
      ...planetOrbit(0, 65, 7),
      needle: {
        show: true,
        needle1: { style: "line", length: 0.1, width: 1, tail: 0 },
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
]

/**
 * A template as the studio holds it: one layer per gauge, each resolved
 * through the same defaults the panels use, so a template only has to
 * describe what makes it different. No template gives the bare defaults.
 */
export const templateLayers = (
  template: GaugeTemplate | null
): GaugeLayer[] => [
  hostLayer(
    template ? resolvePanelValues(template.values) : defaultPanelValues()
  ),
  ...(template?.insets ?? []).map((inset) => ({
    id: inset.name,
    name: layerName(inset.name),
    values: resolvePanelValues(inset.values),
  })),
]

/** A template's own spec and value, for the picker's previews. */
export const templatePreview = (template: GaugeTemplate) => {
  const layers = templateLayers(template)
  return { spec: specFromLayers(layers), value: layers[0].values.value.value }
}
