import {
  barPadding,
  type GaugeDomain,
  type GaugeInsetSpec,
  type GaugeSpec,
  type BaseGaugeSpec,
  type LinearDomain,
  type LinearFrame,
} from "@/lib/gauge-spec"

class Raw {
  constructor(public readonly code: string) {}
}

type PropValue = string | number | boolean | Raw | undefined

const num = (n: number) => Number(n.toFixed(2)).toString()

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

const usesZones = (spec: BaseGaugeSpec) =>
  spec.zones.show || spec.marks.show || (spec.arc.show && spec.arc.colorByZone)

const zonesConst = (spec: BaseGaugeSpec, name: string) =>
  `const ${name} = [\n${spec.zones.list
    .map((zone, i) => {
      const isLast = i === spec.zones.list.length - 1
      const to = isLast ? spec.domain.max : zone.to
      return `  { to: ${num(to)}, color: ${JSON.stringify(zone.color)} },`
    })
    .join("\n")}\n]\n`

const valueType = (spec: BaseGaugeSpec) =>
  spec.rangeFrom === undefined ? "number" : "[number, number]"

const reading = (spec: BaseGaugeSpec, name: string) =>
  spec.rangeFrom === undefined ? name : `${name}[1]`

type Names = {
  zones: string
  value: string
}

const parts = (
  spec: BaseGaugeSpec,
  indent: string,
  used: Set<string>,
  names: Names
) => {
  const body: string[] = []

  if (spec.face.show) {
    used.add("GaugeHub")
    body.push(
      element(
        "GaugeHub",
        { radius: spec.face.radius, color: spec.face.color },
        indent
      )
    )
  }

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
                `zoneColor(${names.zones}, ${reading(spec, names.value)}, ${JSON.stringify(spec.arc.color)})`
              )
            : spec.arc.color,
          opacity: spec.arc.opacity,
          cap: spec.arc.cap,
          offset: spec.arc.offset,
          reverse: spec.arc.reverse ? true : undefined,
          from: spec.arc.from,
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

  if (spec.tickFill.show) {
    used.add("GaugeTickFill")
    const fill = spec.tickFill
    body.push(
      element(
        "GaugeTickFill",
        {
          mode: fill.mode === "fill" ? undefined : fill.mode,
          count: fill.count,
          length: fill.length,
          litLength:
            fill.litLength === fill.length ? undefined : fill.litLength,
          width: fill.width,
          color: fill.color,
          dimColor: fill.dimColor,
          offset: fill.offset,
          cap: fill.cap,
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
            tailDot: needle.tailDot,
            gap: needle.gap,
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
    const dot = {
      radius: spec.dot.radius,
      color: spec.dot.color,
      opacity: spec.dot.opacity,
      offset: spec.dot.offset,
      turns: spec.dot.turns === 1 ? undefined : spec.dot.turns,
    }
    if (spec.dot.both) {
      body.push(element("GaugeDot", { end: "from", ...dot }, indent))
    }
    body.push(element("GaugeDot", dot, indent))
  }

  if (spec.tooltip.show) {
    used.add("GaugeTooltip")
    const { tooltip } = spec
    body.push(
      element(
        "GaugeTooltip",
        {
          label: tooltip.label || undefined,
          unit: tooltip.unit || undefined,
          decimals: tooltip.decimals,
          position: tooltip.position,
          side: tooltip.side === "auto" ? undefined : tooltip.side,
          offset: tooltip.offset,
          gap: tooltip.gap,
          open: tooltip.open || undefined,
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

const paddingProp = (domain: LinearDomain & LinearFrame) =>
  domain.padding === domain.ends
    ? domain.padding
    : new Raw(literal(barPadding(domain)))

const geometry = (domain: GaugeDomain) =>
  domain.shape === "linear"
    ? {
        orientation:
          domain.orientation === "vertical" ? domain.orientation : undefined,
        length: domain.length,
      }
    : {
        startAngle: domain.startAngle,
        endAngle: domain.endAngle,
      }

const insetElement = (
  inset: GaugeInsetSpec,
  indent: string,
  used: Set<string>
) => {
  const { domain } = inset.spec
  const tag = domain.shape === "linear" ? "LinearGaugeInset" : "GaugeInset"
  used.add(tag)
  return container(
    tag,
    {
      x: inset.x,
      y: inset.y,
      scale: inset.scale,
      value: new Raw(inset.name),
      min: domain.min,
      max: domain.max,
      ...geometry(domain),
      radius:
        domain.shape === "linear" || domain.radius === 200
          ? undefined
          : domain.radius,
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

export const gaugeToCode = (spec: GaugeSpec) => {
  const { domain, control } = spec
  const linear = domain.shape === "linear"
  const root = linear ? "LinearGauge" : "Gauge"
  const used = new Set<string>([root])
  const insets = spec.insets ?? []
  const outer = control ? "      " : "    "
  const pad = `${outer}  `
  if (control) used.add("GaugeControl")

  const consts = [usesZones(spec) ? zonesConst(spec, "zones") : null]
  const body = parts(spec, pad, used, { zones: "zones", value: "value" })

  for (const inset of insets) {
    if (usesZones(inset.spec))
      consts.push(zonesConst(inset.spec, `${inset.name}Zones`))
    body.push(insetElement(inset, pad, used))
  }

  const params = [
    ["value", valueType(spec)],
    ...(control ? [["onChange", `(value: ${valueType(spec)}) => void`]] : []),
    ...insets.map((inset) => [inset.name, valueType(inset.spec)]),
  ]
  const signature =
    params.length === 1
      ? `export function CustomGauge({ value }: { value: ${valueType(spec)} }) {`
      : [
          `export function CustomGauge({`,
          ...params.map(([name]) => `  ${name},`),
          `}: {`,
          ...params.map(([name, type]) => `  ${name}: ${type}`),
          `}) {`,
        ].join("\n")

  const gauge = [
    `${outer}<${root}`,
    attributes(
      {
        value: new Raw("value"),
        min: domain.min,
        max: domain.max,
        ...geometry(domain),
        ...(linear
          ? { padding: paddingProp(domain) }
          : {
              radius: domain.radius,
              padding: domain.padding,
              fit: domain.fit === "content" ? domain.fit : undefined,
            }),
        transition: spec.transition
          ? new Raw(literal(spec.transition))
          : undefined,
      },
      outer
    ),
    `${outer}>`,
    ...body,
    `${outer}</${root}>`,
  ]

  const wrapped = control
    ? [
        `    <GaugeControl`,
        attributes(
          {
            value: new Raw("value"),
            onChange: new Raw("onChange"),
            step: control.step,
            label: spec.title.show ? spec.title.text : "Value",
            knob: control.knob || undefined,
          },
          "    "
        ),
        `    >`,
        ...gauge,
        `    </GaugeControl>`,
      ]
    : gauge

  const imports = [...used].sort().join(",\n  ")

  const lines = [
    `import {\n  ${imports},\n} from "@/components/gauge"`,
    "",
    ...consts,
    signature,
    `  return (`,
    ...wrapped,
    `  )`,
    `}`,
  ]

  return lines.filter((l) => l !== null).join("\n")
}
