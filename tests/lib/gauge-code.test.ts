import { describe, expect, it } from "vitest"

import { gaugeToCode } from "@/lib/gauge-code"
import { specFromLayers } from "@/lib/gauge-layers"
import { gaugeTemplates, templateLayers } from "@/lib/gauge-templates"

const specs = gaugeTemplates.map((template) => ({
  name: template.name,
  spec: specFromLayers(templateLayers(template)),
}))

const controlProps = (code: string) => {
  const start = code.indexOf("<GaugeControl")
  return code.slice(start, code.indexOf(">", start))
}

describe("gaugeToCode", () => {
  const round = specs.filter(
    ({ spec }) => spec.control && spec.domain.shape === "round"
  )
  const linear = specs.find(({ spec }) => spec.domain.shape === "linear")

  it("has templates to check", () => {
    expect(round.length).toBeGreaterThan(0)
    expect(linear).toBeDefined()
  })

  it("leaves the geometry of a controlled dial to the gauge", () => {
    for (const { spec } of round) {
      const props = controlProps(gaugeToCode(spec))
      expect(props).toContain("onChange={onChange}")
      expect(props).toContain(`step={${spec.control!.step}}`)
      for (const name of ["min=", "max=", "startAngle=", "endAngle="]) {
        expect(props).not.toContain(name)
      }
    }
  })

  it("leaves the geometry of a controlled bar to the gauge", () => {
    const spec = { ...linear!.spec, control: { knob: false, step: 1 } }
    const code = gaugeToCode(spec)
    const props = controlProps(code)
    expect(props).toContain("step={1}")
    for (const name of ["min=", "max=", "orientation=", "length="]) {
      expect(props).not.toContain(name)
    }
    expect(code).toContain("<LinearGauge")
  })
})
