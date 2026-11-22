import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Gauge, GaugeHub, GaugeNeedle, LinearGauge } from "@/components/gauge"

describe("GaugeHub", () => {
  it("draws a disc at the centre with no needle at all", () => {
    const { container } = render(
      <Gauge value={50}>
        <GaugeHub />
      </Gauge>
    )
    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(1)
    expect(circles[0].getAttribute("r")).toBe("12")
    expect(circles[0].getAttribute("fill")).toBe("currentColor")
    expect(circles[0].hasAttribute("cx")).toBe(false)
    expect(circles[0].hasAttribute("cy")).toBe(false)
    expect(container.querySelectorAll("line, polygon")).toHaveLength(0)
  })

  it("takes a radius and colour", () => {
    const { container } = render(
      <Gauge value={50}>
        <GaugeHub radius={24} color="gold" />
      </Gauge>
    )
    const circle = container.querySelector("circle")
    expect(circle?.getAttribute("r")).toBe("24")
    expect(circle?.getAttribute("fill")).toBe("gold")
  })

  it("draws nothing at radius 0", () => {
    const { container } = render(
      <Gauge value={50}>
        <GaugeHub radius={0} />
      </Gauge>
    )
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("draws once over however many needles there are", () => {
    const { container } = render(
      <Gauge value={50}>
        <GaugeNeedle />
        <GaugeNeedle turns={12} />
        <GaugeHub />
      </Gauge>
    )
    expect(container.querySelectorAll("line")).toHaveLength(2)
    expect(container.querySelectorAll("circle")).toHaveLength(1)
  })

  it("stays put while the value moves", () => {
    const { container, rerender } = render(
      <Gauge value={10}>
        <GaugeHub />
      </Gauge>
    )
    const before = container.innerHTML
    rerender(
      <Gauge value={90}>
        <GaugeHub />
      </Gauge>
    )
    expect(container.innerHTML).toBe(before)
  })

  it("sits at the middle of a bar", () => {
    const { container } = render(
      <LinearGauge value={50}>
        <GaugeHub radius={6} />
      </LinearGauge>
    )
    expect(container.querySelector("circle")?.getAttribute("r")).toBe("6")
  })
})
