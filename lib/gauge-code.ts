import type { GaugeInsetSpec, GaugeSpec } from "@/lib/gauge-spec"

/** A prop value emitted verbatim as a JSX expression. */
class Raw {
  constructor(public readonly code: string) {}
}

type PropValue = string | number | boolean | Raw | undefined

const num = (n: number) => Number(n.toFixed(2)).toString()

/** An object or array as a JS literal with unquoted keys. */
const literal = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`
  if (typeof value === "number") return num(value)
  if (typeof value === "string") return JSON.stringify(value)
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${literal(v)}`)
    return `{ ${entries.join(", ")} }`
  }
  return String(value)
}

const prop = (key: string, value: PropValue) => {
  if (value === undefined) return null
  if (value instanceof Raw) return `${key}={${value.code}}`
  if (typeof value === "boolean") return value ? key : `${key}={false}`
  if (typeof value === "number") return `${key}={${num(value)}}`
  return `${key}=${JSON.stringify(value)}`
}

const attributes = (props: Record<string, PropValue>, indent: string) =>
  Object.entries(props)
    .map(([k, v]) => prop(k, v))
    .filter((s): s is string => s !== null)
    .map((a) => `${indent}  ${a}`)
    .join("\n")

const element = (
  tag: string,
  props: Record<string, PropValue>,
  indent: string,
  children?: string
) => {
  const inner = attributes(props, indent)
  if (children === undefined) return `${indent}<${tag}\n${inner}\n${indent}/>`
  return `${indent}<${tag}\n${inner}\n${indent}>\n${indent}  ${children}\n${indent}</${tag}>`
}

/** An element wrapped around elements of its own, already indented. */
const container = (
  tag: string,
  props: Record<string, PropValue>,
  indent: string,
  children: string[]
) =>
  [
    `${indent}<${tag}`,
    attributes(props, indent),
    `${indent}>`,
    ...children,
    `${indent}</${tag}>`,
  ].join("\n")

/** Whether a spec refers to its zone list, by band, marks or arc colour. */
const usesZones = (spec: GaugeSpec) =>
  spec.zones.show || spec.marks.show || (spec.arc.show && spec.arc.colorByZone)

/** The zone list as a `const`, named so insets can each have their own. */
const zonesConst = (spec: GaugeSpec, name: string) =>
  `const ${name} = [\n${spec.zones.list
    .map((zone, i) => {
      const isLast = i === spec.zones.list.length - 1
      const to = isLast ? spec.domain.max : zone.to
      return `  { to: ${num(to)}, color: ${JSON.stringify(zone.color)} },`
    })
    .join("\n")}\n]\n`

type Names = {
  /** The variable holding this gauge's zone list. */
  zones: string
  /** The prop this gauge's value comes in on. */
  value: string
}

/**
 * Everything a spec draws inside its gauge root, mirroring `GaugeParts` in
 * `components/gauge-preview.tsx`. Adds the components it uses to `used`.
 */
const parts = (
  spec: GaugeSpec,
  indent: string,
  used: Set<string>,
  names: Names
) => {
  const body: string[] = []

  if (spec.track.show) {
    used.add("GaugeTrack")
    body.push(
      element(
        "GaugeTrack",
        {
          width: spec.track.width,
          color: spec.track.color,
          opacity: spec.track.opacity,
          cap: spec.track.cap,
          offset: spec.track.offset,
        },
        indent
      )
    )
  }

  if (spec.zones.show) {
    used.add("GaugeZones")
    body.push(
      element(
        "GaugeZones",
        {
          zones: new Raw(names.zones),
          width: spec.zones.width,
          offset: spec.zones.offset,
          gap: spec.zones.gap,
          cap: spec.zones.cap,
          endCap:
            spec.zones.endCap === spec.zones.cap
              ? undefined
              : spec.zones.endCap,
          opacity: spec.zones.opacity,
        },
        indent
      )
    )
  }

  if (spec.arc.show) {
    used.add("GaugeArc")
    body.push(
      element(
        "GaugeArc",
        {
          width: spec.arc.width,
          color: spec.arc.colorByZone
            ? new Raw(
                `zoneColor(${names.zones}, ${names.value}, ${JSON.stringify(spec.arc.color)})`
              )
            : spec.arc.color,
          opacity: spec.arc.opacity,
          cap: spec.arc.cap,
          offset: spec.arc.offset,
          reverse: spec.arc.reverse ? true : undefined,
        },
        indent
      )
    )
  }

  if (spec.marks.show) {
    used.add("GaugeMarks")
    body.push(
      element(
        "GaugeMarks",
        {
          values: new Raw(`zoneCutoffs(${names.zones})`),
          length: spec.marks.length,
          width: spec.marks.width,
          color: spec.marks.color,
          offset: spec.marks.offset,
          cap: spec.marks.cap,
        },
        indent
      )
    )
  }

  for (const ticks of [spec.minorTicks, spec.majorTicks]) {
    if (!ticks.show) continue
    used.add("GaugeTicks")
    body.push(
      element(
        "GaugeTicks",
        {
          count: ticks.count,
          length: ticks.length,
          width: ticks.width,
          color: ticks.color,
          offset: ticks.offset,
          cap: ticks.cap,
          opacity: ticks.opacity,
        },
        indent
      )
    )
  }

  if (spec.tickLabels.show) {
    used.add("GaugeTickLabels")
    const format =
      spec.tickLabels.format === "number"
        ? null
        : `${spec.tickLabels.format}Label`
    if (format) used.add(format)
    body.push(
      element(
        "GaugeTickLabels",
        {
          count: spec.tickLabels.count,
          offset: spec.tickLabels.offset,
          fontSize: spec.tickLabels.fontSize,
          color: spec.tickLabels.color,
          font: spec.tickLabels.font,
          weight: spec.tickLabels.weight,
          decimals: format ? undefined : spec.tickLabels.decimals,
          format: format ? new Raw(format) : undefined,
        },
        indent
      )
    )
  }

  if (spec.needles.show) {
    used.add("GaugeNeedle")
    for (const needle of spec.needles.list) {
      body.push(
        element(
          "GaugeNeedle",
          {
            style: needle.style,
            length: needle.length,
            width: needle.width,
            color: needle.color,
            tail: needle.tail,
            tailColor:
              needle.tailColor === needle.color ? undefined : needle.tailColor,
            turns: needle.turns === 1 ? undefined : needle.turns,
          },
          indent
        )
      )
    }
    if (spec.needles.hub.radius > 0) {
      used.add("GaugeHub")
      body.push(
        element(
          "GaugeHub",
          { radius: spec.needles.hub.radius, color: spec.needles.hub.color },
          indent
        )
      )
    }
  }

  if (spec.dot.show) {
    used.add("GaugeDot")
    body.push(
      element(
        "GaugeDot",
        {
          radius: spec.dot.radius,
          color: spec.dot.color,
          opacity: spec.dot.opacity,
          offset: spec.dot.offset,
          turns: spec.dot.turns === 1 ? undefined : spec.dot.turns,
        },
        indent
      )
    )
  }

  if (spec.value.show) {
    used.add("GaugeValue")
    body.push(
      element(
        "GaugeValue",
        {
          x: spec.value.x,
          y: spec.value.y,
          fontSize: spec.value.fontSize,
          color: spec.value.color,
          font: spec.value.font,
          weight: spec.value.weight,
          anchor:
            spec.value.anchor === "middle" ? undefined : spec.value.anchor,
          decimals: spec.value.decimals,
        },
        indent
      )
    )
  }

  for (const label of [spec.unit, spec.title]) {
    if (!label.show) continue
    used.add("GaugeText")
    body.push(
      element(
        "GaugeText",
        {
          x: label.x,
          y: label.y,
          fontSize: label.fontSize,
          color: label.color,
          font: label.font,
          weight: label.weight,
          anchor: label.anchor === "middle" ? undefined : label.anchor,
        },
        indent,
        label.text
      )
    )
  }

  if (spec.arc.show && spec.arc.colorByZone) used.add("zoneColor")
  if (spec.marks.show) used.add("zoneCutoffs")

  return body
}

/** The nested gauge for one inset, with all of its own parts inside it. */
const insetElement = (
  inset: GaugeInsetSpec,
  indent: string,
  used: Set<string>
) => {
  used.add("GaugeInset")
  const { domain } = inset.spec
  return container(
    "GaugeInset",
    {
      x: inset.x,
      y: inset.y,
      scale: inset.scale,
      value: new Raw(inset.name),
      min: domain.min,
      max: domain.max,
      startAngle: domain.startAngle,
      endAngle: domain.endAngle,
      /* The inset keeps the host's reference radius and takes its size from
         `scale`, so the radius is only worth printing when it differs. */
      radius: domain.radius === 200 ? undefined : domain.radius,
      transition: inset.spec.transition
        ? new Raw(literal(inset.spec.transition))
        : undefined,
    },
    indent,
    parts(inset.spec, `${indent}  `, used, {
      zones: `${inset.name}Zones`,
      value: inset.name,
    })
  )
}

/** JSX for a component that renders `spec` with the gauge primitives. */
export const gaugeToCode = (spec: GaugeSpec) => {
  const { domain } = spec
  const used = new Set<string>(["Gauge"])
  const insets = spec.insets ?? []
  const pad = "      "

  /* Each gauge gets its own zone list, named after the inset it belongs to. */
  const consts = [usesZones(spec) ? zonesConst(spec, "zones") : null]
  const body = parts(spec, pad, used, { zones: "zones", value: "value" })

  for (const inset of insets) {
    if (usesZones(inset.spec))
      consts.push(zonesConst(inset.spec, `${inset.name}Zones`))
    body.push(insetElement(inset, pad, used))
  }

  /* Every gauge in the tree takes its value from a prop of its own. A gauge
     on its own keeps the one-line signature; a list of them is broken up the
     way prettier would. */
  const params = ["value", ...insets.map((inset) => inset.name)]
  const signature =
    insets.length === 0
      ? `export function CustomGauge({ value }: { value: number }) {`
      : [
          `export function CustomGauge({`,
          ...params.map((name) => `  ${name},`),
          `}: {`,
          ...params.map((name) => `  ${name}: number`),
          `}) {`,
        ].join("\n")

  const imports = [...used].sort().join(",\n  ")

  const lines = [
    `import {\n  ${imports},\n} from "@/components/gauge"`,
    "",
    ...consts,
    signature,
    `  return (`,
    `    <Gauge`,
    `      value={value}`,
    `      min={${num(domain.min)}}`,
    `      max={${num(domain.max)}}`,
    `      startAngle={${num(domain.startAngle)}}`,
    `      endAngle={${num(domain.endAngle)}}`,
    `      radius={${num(domain.radius)}}`,
    `      padding={${num(domain.padding)}}`,
    domain.fit === "content" ? `      fit="content"` : null,
    spec.transition ? `      transition={${literal(spec.transition)}}` : null,
    `    >`,
    ...body,
    `    </Gauge>`,
    `  )`,
    `}`,
  ]

  return lines.filter((l) => l !== null).join("\n")
}
