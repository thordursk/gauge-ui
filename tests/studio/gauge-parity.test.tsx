import type { ComponentType } from "react"
import * as jsxRuntime from "react/jsx-runtime"
import ts from "typescript"
import { describe, expect, it, vi } from "vitest"

import * as gaugeModule from "@/components/gauge"
import type { GaugeTooltipProps } from "@/components/gauge"
import { GaugePreview } from "@/components/gauge-preview"
import { gaugeToCode } from "@/lib/gauge-code"
import type { GaugeSpec } from "@/lib/gauge-spec"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"
import { markup } from "@/tests/markup"

vi.mock("@/components/gauge", async (importOriginal) => ({
  ...(await importOriginal<typeof gaugeModule>()),
  GaugeTooltip: (props: GaugeTooltipProps) => (
    <g
      data-tooltip={JSON.stringify(
        Object.entries({ ...props, side: props.side ?? "auto" })
          .filter(([, value]) => value !== undefined)
          .sort()
      )}
    />
  ),
}))

const modules: Record<string, unknown> = {
  "@/components/gauge": gaugeModule,
  "react/jsx-runtime": jsxRuntime,
}

const compile = (code: string) => {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const exports: { CustomGauge?: ComponentType<Record<string, unknown>> } = {}
  const require = (name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`)
    return modules[name]
  }
  new Function("require", "exports", outputText)(require, exports)
  if (!exports.CustomGauge) throw new Error("No CustomGauge exported")
  return exports.CustomGauge
}

const valueOf = (spec: GaugeSpec, value: number) =>
  spec.rangeFrom === undefined ? value : [spec.rangeFrom, value]

const rootSvg = (html: string) =>
  html
    .slice(html.indexOf("<svg"), html.lastIndexOf("</svg>") + "</svg>".length)
    .replace(/^(<svg[^>]*?) class="[^"]*"/, "$1")

const stableIds = (html: string) => {
  const ids = new Map<string, string>()
  return html.replace(/_R_[0-9a-z]+_/g, (id) => {
    if (!ids.has(id)) ids.set(id, `_id${ids.size}_`)
    return ids.get(id)!
  })
}

const generated = (spec: GaugeSpec, value: number) => {
  const CustomGauge = compile(gaugeToCode(spec))
  const values = Object.fromEntries(
    (spec.insets ?? []).map((inset) => [
      inset.name,
      valueOf(inset.spec, inset.value),
    ])
  )
  return stableIds(
    rootSvg(
      markup(
        <CustomGauge
          value={valueOf(spec, value)}
          onChange={() => {}}
          {...values}
        />
      )
    )
  )
}

const printed = <T,>(value: T): T => {
  if (typeof value === "number") return Number(value.toFixed(2)) as T
  if (Array.isArray(value)) return value.map(printed) as T
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, printed(v)])
    ) as T
  return value
}

const previewed = (spec: GaugeSpec, value: number) =>
  stableIds(
    rootSvg(markup(<GaugePreview spec={printed(spec)} value={value} />))
  )

const showEverything = (spec: GaugeSpec): GaugeSpec => {
  const shown = Object.fromEntries(
    Object.entries(spec).map(([key, part]) =>
      part && typeof part === "object" && "show" in part
        ? [key, { ...part, show: true }]
        : [key, part]
    )
  ) as GaugeSpec
  return {
    ...shown,
    arc: { ...shown.arc, colorByZone: true },
    dot: { ...shown.dot, both: true },
    needles: {
      ...shown.needles,
      show: spec.domain.shape === "round",
    },
    insets: spec.insets?.map((inset) => ({
      ...inset,
      spec: showEverything(inset.spec),
    })),
  }
}

const plusOne = <T,>(value: T): T => {
  if (typeof value === "number") return (value + 1) as T
  if (Array.isArray(value)) return value.map(plusOne) as T
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, plusOne(v)])
    ) as T
  return value
}

const offDefaults = (spec: GaugeSpec): GaugeSpec => {
  const { domain, insets, control, transition, rangeFrom, ...parts } = spec
  return {
    ...plusOne(parts),
    arc: { ...plusOne(parts.arc), reverse: !parts.arc.reverse },
    domain,
    control,
    transition,
    rangeFrom,
    insets: insets?.map((inset) => ({
      ...inset,
      spec: offDefaults(inset.spec),
    })),
  }
}

const cases = gaugeTemplates.map((template) => {
  const { spec, value } = templatePreview(template)
  return [template.id, spec, value] as const
})

describe("generated code draws what the preview draws", () => {
  it.each(cases)("for the %s template", (_, spec, value) => {
    expect(generated(spec, value)).toBe(previewed(spec, value))
  })

  it.each(cases)(
    "for the %s template with every part shown",
    (_, spec, value) => {
      const everything = showEverything(spec)
      expect(generated(everything, value)).toBe(previewed(everything, value))
    }
  )

  it.each(cases)("for the %s template off its defaults", (_, spec, value) => {
    const moved = offDefaults(showEverything(spec))
    expect(generated(moved, value)).toBe(previewed(moved, value))
  })
})
