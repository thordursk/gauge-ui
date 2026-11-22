import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Gauge, GaugeArc, GaugeTrack } from "@/components/gauge"

describe("Gauge", () => {
  it("boxes the whole circle plus padding by default", () => {
    const { container } = render(
      <Gauge value={50} radius={100} padding={10}>
        <GaugeTrack />
        <GaugeArc />
      </Gauge>
    )
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("viewBox")).toBe("-110 -110 220 220")
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })
})
