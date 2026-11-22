import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GaugePreview } from "@/components/gauge-preview"
import { gaugeToCode } from "@/lib/gauge-code"
import {
  NO_PAINT,
  buildSpec,
  css,
  cutoffsConfig,
  defaultPanelValues,
  markValues,
  needleConfig,
  resolvePanelValues,
  type PanelUpdates,
} from "@/lib/gauge-panels"

const bar = (cutoffs: PanelUpdates["cutoffs"]): PanelUpdates => ({
  gauge: { shape: "linear", min: 0, max: 100, length: 400 },
  arcs: { track: { show: false }, arc: { show: false } },
  text: { value: { show: false }, unit: { show: false } },
  cutoffs,
})

const specOf = (updates: PanelUpdates) => buildSpec(resolvePanelValues(updates))

const markXs = (container: HTMLElement) =>
  [...container.querySelectorAll("line")].map((l) =>
    Number(l.getAttribute("x1"))
  )

const optionValues = (config: { token: { options: unknown[] } }) =>
  config.token.options.map((o) =>
    typeof o === "string" ? o : (o as { value: string }).value
  )

describe("cutoffs panel", () => {
  it("defaults to a drawn band and marks at the zone cutoffs", () => {
    const { cutoffs } = defaultPanelValues()
    expect(cutoffs.band.show).toBe(true)
    expect(cutoffs.marks.values).toBe("")
  })

  it("labels the blank values field with what it falls back to", () => {
    expect(cutoffsConfig(0, 100).marks.values).toEqual({
      type: "text",
      default: "",
      placeholder: "Zone cutoffs",
    })
  })

  it("offers no paint for zones only", () => {
    const config = cutoffsConfig(0, 100)
    for (const zone of [
      config.zone1,
      config.zone2,
      config.zone3,
      config.zone4,
    ]) {
      expect(optionValues(zone.color)).toContain(NO_PAINT)
    }
    expect(optionValues(config.marks.color)).not.toContain(NO_PAINT)
  })
})

describe("markValues", () => {
  it("leaves the marks at the cutoffs when blank", () => {
    expect(markValues("", 0, 100)).toBeUndefined()
    expect(markValues("   ", 0, 100)).toBeUndefined()
  })

  it("reads numbers split by commas or spaces", () => {
    expect(markValues("25, 50 75,", 0, 100)).toEqual([25, 50, 75])
    expect(markValues("-0.5,0.25", -1, 1)).toEqual([-0.5, 0.25])
  })

  it("drops what is not a number or is outside the domain", () => {
    expect(markValues("-, 10, abc, 120, -5, 100", 0, 100)).toEqual([10, 100])
    expect(markValues("abc", 0, 100)).toEqual([])
  })
})

describe("buildSpec", () => {
  it("places marks at the values given", () => {
    const spec = specOf(
      bar({ show: true, marks: { show: true, values: "25, 50, 75" } })
    )
    expect(spec.marks.show).toBe(true)
    expect(spec.marks.values).toEqual([25, 50, 75])
  })

  it("keeps the marks at the cutoffs with the field blank", () => {
    const spec = specOf(bar({ show: true, marks: { show: true } }))
    expect(spec.marks.values).toBeUndefined()
  })

  it("hides the band on its own, leaving the marks", () => {
    const spec = specOf(
      bar({ show: true, band: { show: false }, marks: { show: true } })
    )
    expect(spec.zones.show).toBe(false)
    expect(spec.marks.show).toBe(true)
  })

  it("hides band and marks with the panel", () => {
    const spec = specOf(
      bar({ show: false, band: { show: true }, marks: { show: true } })
    )
    expect(spec.zones.show).toBe(false)
    expect(spec.marks.show).toBe(false)
  })

  it("paints a zone set to none with no paint", () => {
    expect(css({ token: NO_PAINT })).toBe("none")
    const spec = specOf(
      bar({
        show: true,
        count: 2,
        zone1: { to: 80, color: { token: NO_PAINT } },
        zone2: { color: { token: "foreground" } },
      })
    )
    expect(spec.zones.list).toEqual([
      { to: 80, color: "none" },
      { to: 100, color: "var(--foreground)" },
    ])
  })
})

describe("preview", () => {
  it("draws the marks at the values given", () => {
    const spec = specOf(
      bar({
        show: true,
        band: { show: false },
        marks: { show: true, values: "25, 50, 75" },
      })
    )
    const { container } = render(<GaugePreview spec={spec} value={50} />)
    expect(markXs(container)).toEqual([-100, 0, 100])
    expect(container.querySelectorAll("path")).toHaveLength(0)
  })

  it("draws the marks at the zone cutoffs with the field blank", () => {
    const spec = specOf(
      bar({
        show: true,
        count: 2,
        zone1: { to: 40 },
        band: { show: false },
        marks: { show: true },
      })
    )
    const { container } = render(<GaugePreview spec={spec} value={50} />)
    expect(markXs(container)).toEqual([-40])
  })
})

describe("generated code", () => {
  it("writes the values out, with no zones when nothing needs them", () => {
    const code = gaugeToCode(
      specOf(
        bar({
          show: true,
          band: { show: false },
          marks: { show: true, values: "25, 50, 75" },
        })
      )
    )
    expect(code).toContain("values={[25, 50, 75]}")
    expect(code).not.toContain("zoneCutoffs")
    expect(code).not.toContain("const zones")
    expect(code).not.toContain("GaugeZones")
  })

  it("keeps the zones for a band drawn beside marks at values", () => {
    const code = gaugeToCode(
      specOf(bar({ show: true, marks: { show: true, values: "10" } }))
    )
    expect(code).toContain("values={[10]}")
    expect(code).toContain("const zones")
    expect(code).toContain("<GaugeZones")
    expect(code).not.toContain("zoneCutoffs")
  })

  it("marks the zone cutoffs with the field blank", () => {
    const code = gaugeToCode(
      specOf(bar({ show: true, band: { show: false }, marks: { show: true } }))
    )
    expect(code).toContain("values={zoneCutoffs(zones)}")
    expect(code).toContain("zoneCutoffs,")
    expect(code).toContain("const zones")
    expect(code).not.toContain("<GaugeZones")
  })

  it("writes a zone with no paint as none", () => {
    const code = gaugeToCode(
      specOf(
        bar({
          show: true,
          count: 2,
          zone1: { to: 80, color: { token: NO_PAINT } },
        })
      )
    )
    expect(code).toContain('{ to: 80, color: "none" }')
  })
})

describe("needle panel", () => {
  const hubOnly: PanelUpdates = {
    arcs: { track: { show: false }, arc: { show: false } },
    text: { value: { show: false }, unit: { show: false } },
    needle: { show: true, count: 0, hub: { radius: 24 } },
  }

  it("allows no needles at all", () => {
    expect(needleConfig().count).toEqual([1, 0, 3, 1])
    const spec = specOf(hubOnly)
    expect(spec.needles.show).toBe(true)
    expect(spec.needles.list).toEqual([])
    expect(spec.needles.hub.radius).toBe(24)
  })

  it("previews the hub alone", () => {
    const { container } = render(
      <GaugePreview spec={specOf(hubOnly)} value={50} />
    )
    expect(container.querySelectorAll("line, polygon")).toHaveLength(0)
    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(1)
    expect(circles[0].getAttribute("r")).toBe("24")
  })

  it("writes the hub without importing the needle", () => {
    const code = gaugeToCode(specOf(hubOnly))
    expect(code).toContain("<GaugeHub")
    expect(code).toContain("radius={24}")
    expect(code).not.toContain("GaugeNeedle")
  })
})
