# gauge-ui

Composable SVG gauge primitives for React, distributed as a [shadcn](https://ui.shadcn.com) registry. Design a gauge in the studio, copy the code, and own the source in your project. No runtime dependencies beyond React and the shadcn `cn` helper.

## Install

```bash
npx shadcn@latest add https://gauge-ui.vercel.app/r/gauge.json
```

Or register the namespace once in `components.json` and install by name:

```json
{
  "registries": {
    "@gauge-ui": "https://gauge-ui.vercel.app/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @gauge-ui/gauge
```

The files land in `components/gauge/`.

## Usage

```tsx
import {
  Gauge,
  GaugeArc,
  GaugeHub,
  GaugeNeedle,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  zoneColor,
} from "@/components/gauge"

const zones = [
  { to: 60, color: "#22c55e" },
  { to: 80, color: "#f59e0b" },
  { to: 100, color: "#ef4444" },
]

export function Speed({ value }: { value: number }) {
  return (
    <Gauge value={value} min={0} max={100} startAngle={40} endAngle={320}>
      <GaugeTrack width={14} />
      <GaugeZones zones={zones} width={14} />
      <GaugeArc width={14} color={zoneColor(zones, value, "currentColor")} />
      <GaugeTicks count={10} />
      <GaugeTickLabels count={5} />
      <GaugeNeedle style="pointer" />
      <GaugeHub />
      <GaugeValue decimals={0} />
    </Gauge>
  )
}
```

`Gauge` owns the domain and geometry. Every child reads value, angles and radius from context and positions itself against the reference radius, so parts can be added, removed or reordered freely. Angles are measured clockwise from six o'clock.

| Primitive | Draws |
| --- | --- |
| `GaugeTrack` | Background arc across the whole sweep |
| `GaugeArc` | Filled arc from the start to the current value, or back from the end with `reverse` |
| `GaugeZones` | Coloured bands between zone cutoffs |
| `GaugeTicks` | Evenly spaced tick marks |
| `GaugeMarks` | Marks at arbitrary values, such as zone cutoffs |
| `GaugeTickLabels` | Numeric, compass or clock labels along the arc |
| `GaugeNeedle` | Line, pointer or compass needle |
| `GaugeHub` | Centre cap for the needle |
| `GaugeValue` | Formatted current value |
| `GaugeText` | Free text at any position, for units and titles |
| `GaugeInset` | A whole gauge nested inside another, at its own scale |

Helpers `zoneColor`, `zoneCutoffs`, `compassLabel` and `clockLabel` are exported from the same module and are what the studio's generated code uses.

## Nested gauges

`GaugeInset` is a second gauge drawn inside the first: a fuel dial under a speedometer, a ring inside a ring. It takes its own value and domain and publishes the same context `Gauge` does, so every primitive works inside it unchanged.

```tsx
<Gauge value={speed} min={0} max={240} startAngle={40} endAngle={320}>
  <GaugeTicks count={12} />
  <GaugeNeedle style="pointer" />
  <GaugeHub />
  <GaugeInset
    value={fuel}
    y={144}
    scale={0.28}
    min={0}
    max={100}
    startAngle={90}
    endAngle={270}
  >
    <GaugeTrack width={26} />
    <GaugeArc width={26} />
  </GaugeInset>
</Gauge>
```

It draws in the host gauge's coordinate system rather than a viewport of its own, so it takes no `padding` or `fit`. `x` and `y` place its centre in the host's SVG units, and `scale` sizes the whole thing at once: strokes, ticks and text shrink with the dial, so parts meant to be read at a quarter size are worth drawing heavier than they would be at full size. Insets can be stacked for concentric rings, and each one animates its own value.

The Speed & fuel, Nested rings and System templates in the studio are built this way. The studio edits every gauge in a composition: the chips above the value slider pick which one the panels, the slider and the play modes are pointed at, and the same row adds and removes them. An inset's Gauge panel trades `padding`, `fit` and the stage colour for where it sits and how big it is drawn. The generated code takes a prop per gauge.

## Animation

Value changes are instant by default. Pass `transition` to `Gauge` and every part that reads the value, including the arc, needle and value text, animates together. No animation library is involved; the gauge steps its own spring or tween per frame and snaps when the viewer prefers reduced motion.

```tsx
// A gentle spring with the default settings
<Gauge value={value} transition>

// Tune the spring by feel
<Gauge value={value} transition={{ type: "spring", visualDuration: 0.4, bounce: 0.25 }}>

// Or by physics, which takes precedence when given
<Gauge value={value} transition={{ type: "spring", stiffness: 120, damping: 14, mass: 1 }}>

// A timed tween with a named curve, cubic-bezier points, or your own function
<Gauge value={value} transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}>
<Gauge value={value} transition={{ type: "tween", duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>

// Sweep in from the minimum on mount
<Gauge value={value} initialValue={0} transition>
```

| Option | Applies to | Meaning |
| --- | --- | --- |
| `visualDuration` | spring | Seconds the spring visibly takes to arrive. Default 0.5 |
| `bounce` | spring | 0 settles without overshoot, 1 rings freely. Default 0.1 |
| `stiffness`, `damping`, `mass` | spring | Raw physics. Defaults 100, 10 and 1 when any is set |
| `duration` | tween | Seconds. Default 0.5 |
| `ease` | tween | `linear`, `easeIn`, `easeOut`, `easeInOut`, `[x1, y1, x2, y2]` or `(t) => number`. Default `easeInOut` |

Inside custom primitives, `useGauge()` exposes both `value`, the animated figure being drawn this frame, and `target`, the value the gauge is heading for. The studio's Value panel has the same controls, and the code it generates carries your transition.

## Studio

This repository is also the studio at the registry homepage. Run it locally with:

```bash
npm install
npm run dev
```

## Registry

`registry.json` at the repository root defines the single `gauge` item. `npm run registry:build` writes the installable JSON to `public/r/`, and the production build runs it automatically so the deployed site always serves the current source.
