import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Gauge,
  GaugeArc,
  LinearGauge,
  arcPath,
  type GaugeRange,
} from "@/components/gauge"

const arcOn = (
  root: "ring" | "dial" | "bar",
  props: Parameters<typeof GaugeArc>[0],
  value: number | GaugeRange = 0
) => {
  const fill = <GaugeArc {...props} />
  const { container } = render(
    root === "bar" ? (
      <LinearGauge value={value} min={0} max={24} length={240} wrap>
        {fill}
      </LinearGauge>
    ) : (
      <Gauge
        value={value}
        min={0}
        max={24}
        radius={100}
        startAngle={root === "ring" ? 180 : 40}
        endAngle={root === "ring" ? 540 : 320}
        wrap
      >
        {fill}
      </Gauge>
    )
  )
  return container.querySelector("path")?.getAttribute("d") ?? null
}

describe("GaugeArc wrap", () => {
  it("carries a span on round a ring past the seam", () => {
    expect(arcOn("ring", { from: 22, to: 26, wrap: true })).toBe(
      arcPath(100, 180 + 22 * 15, 180 + 26 * 15)
    )
  })

  it("starts a span that begins past the end back at the start", () => {
    expect(arcOn("ring", { from: 25, to: 27, wrap: true })).toBe(
      arcPath(100, 180 + 15, 180 + 45)
    )
  })

  it("holds a span longer than the domain to one turn", () => {
    expect(arcOn("ring", { from: 0, to: 30, wrap: true })).toBe(
      arcPath(100, 180, 540)
    )
  })

  it("brings a span past the end of a bar back in at its start", () => {
    expect(arcOn("bar", { from: 20, to: 26, wrap: true })).toBe(
      "M 80 0 L 120 0 M -120 0 L -100 0"
    )
  })

  it("draws a span inside a bar as one segment", () => {
    expect(arcOn("bar", { from: 2, to: 6, wrap: true })).toBe(
      "M -100 0 L -60 0"
    )
  })

  it("runs a wrapped range forward from its start", () => {
    expect(arcOn("ring", {}, [22, 2])).toBe(
      arcPath(100, 180 + 22 * 15, 180 + 26 * 15)
    )
    expect(arcOn("bar", {}, [22, 2])).toBe("M 100 0 L 120 0 M -120 0 L -100 0")
  })

  it("draws nothing for an empty span", () => {
    expect(arcOn("ring", { from: 5, to: 5, wrap: true })).toBeNull()
  })

  it("wraps a domain that does not start at zero", () => {
    const { container } = render(
      <LinearGauge value={0} min={100} max={124} length={240}>
        <GaugeArc from={120} to={126} wrap />
      </LinearGauge>
    )
    expect(container.querySelector("path")?.getAttribute("d")).toBe(
      "M 80 0 L 120 0 M -120 0 L -100 0"
    )
  })
})
