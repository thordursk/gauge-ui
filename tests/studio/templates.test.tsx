import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GaugePreview } from "@/components/gauge-preview"
import { gaugeToCode } from "@/lib/gauge-code"
import type { BaseGaugeSpec, GaugeSpec } from "@/lib/gauge-spec"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

describe("gauge templates", () => {
  it("keep their shelves and order", () => {
    expect(gaugeTemplates.map((t) => `${t.category}/${t.id}`)).toMatchSnapshot()
  })

  describe.each(gaugeTemplates.map((t) => [t.id, t] as const))(
    "%s",
    (_, template) => {
      const { spec, value } = templatePreview(template)

      it("generates the same code", () => {
        expect(gaugeToCode(spec)).toMatchSnapshot()
      })

      it("renders the same preview", () => {
        expect(
          renderToStaticMarkup(<GaugePreview spec={spec} value={value} />)
        ).toMatchSnapshot()
      })

      it("renders the same played-in preview", () => {
        expect(
          renderToStaticMarkup(
            <GaugePreview spec={spec} value={value} playIn={0} />
          )
        ).toMatchSnapshot()
      })
    }
  )
})

const template = (id: string) => {
  const found = gaugeTemplates.find((t) => t.id === id)
  if (!found) throw new Error(`No template ${id}`)
  return templatePreview(found)
}

const layers = (spec: GaugeSpec): BaseGaugeSpec[] => [
  spec,
  ...(spec.insets ?? []).map((inset) => inset.spec),
]

const preview = (id: string) => {
  const { spec, value } = template(id)
  return render(<GaugePreview spec={spec} value={value} tooltips={false} />)
    .container
}

describe("every template", () => {
  const all = gaugeTemplates.flatMap((t) =>
    layers(templatePreview(t).spec).map((spec) => [t.id, spec] as const)
  )

  it.each(all)("%s draws no band it hides", (_, spec) => {
    expect(spec.zones.show && spec.zones.opacity === 0).toBe(false)
  })

  it.each(all)("%s hides no needle under its hub", (_, spec) => {
    if (!spec.needles.show || spec.domain.shape !== "round") return
    for (const needle of spec.needles.list) {
      expect(needle.length * spec.domain.radius).toBeGreaterThan(
        spec.needles.hub.radius
      )
    }
  })
})

describe("templates with marks at values", () => {
  it.each([
    ["battery", [80]],
    ["throttle", [25, 50, 75]],
    ["tank", [25, 50, 75]],
    ["delta", [0]],
    ["eq-fader", [0]],
  ])("%s marks %j with no band", (id, values) => {
    const { spec } = template(id)
    expect(spec.zones.show).toBe(false)
    expect(spec.marks.show).toBe(true)
    expect(spec.marks.values).toEqual(values)

    const code = gaugeToCode(spec)
    expect(code).toContain(`values={[${values.join(", ")}]}`)
    expect(code).not.toContain("GaugeZones")
    expect(code).not.toContain("zoneCutoffs")
  })

  it("draws the Battery's charge limit as one notch across the ring", () => {
    const container = preview("battery")
    const lines = [...container.querySelectorAll("line")]
    expect(lines).toHaveLength(1)
    expect(lines[0].parentElement?.getAttribute("stroke-width")).toBe("5")
    const { x1, y1, x2, y2 } = Object.fromEntries(
      ["x1", "y1", "x2", "y2"].map((k) => [k, Number(lines[0].getAttribute(k))])
    )
    expect(Math.hypot(x1, y1)).toBeCloseTo(177)
    expect(Math.hypot(x2, y2)).toBeCloseTo(223)
    expect(Math.atan2(y1, x1)).toBeCloseTo(Math.atan2(y2, x2))
  })

  it("cuts the Throttle into quarters across the bar", () => {
    const container = preview("throttle")
    const xs = [...container.querySelectorAll("line")].map((l) =>
      Number(l.getAttribute("x1"))
    )
    expect(xs).toEqual([-100, 0, 100])
  })
})

describe("Rev tape", () => {
  it("draws the band past the shift point and leaves the rest unpainted", () => {
    const { spec } = template("rev-tape")
    expect(spec.zones.show).toBe(true)
    expect(spec.zones.list).toEqual([
      { to: 11, color: "none" },
      { to: 12, color: "var(--foreground)" },
    ])
    const strokes = [...preview("rev-tape").querySelectorAll("g > g > path")]
      .map((p) => p.getAttribute("stroke"))
      .slice(0, 2)
    expect(strokes).toEqual(["none", "var(--foreground)"])
    expect(gaugeToCode(spec)).toContain('{ to: 11, color: "none" }')
  })
})

describe("Orrery", () => {
  it("draws the Sun as a hub with no needle", () => {
    const { spec } = template("orrery")
    expect(spec.needles.show).toBe(true)
    expect(spec.needles.list).toEqual([])
    expect(spec.needles.hub.radius).toBe(24)

    const container = preview("orrery")
    expect(container.querySelectorAll("line, polygon")).toHaveLength(0)
    expect(container.querySelectorAll('circle[r="24"]')).toHaveLength(1)

    const code = gaugeToCode(spec)
    expect(code).not.toContain("GaugeNeedle")
    expect(code).toContain("<GaugeHub")
  })

  it("keeps a planet on each of its four orbits", () => {
    const { spec } = template("orrery")
    expect(layers(spec).filter((layer) => layer.dot.show)).toHaveLength(4)
  })
})
