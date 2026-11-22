import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Gauge,
  GaugeZones,
  LinearGauge,
  zoneColor,
  zoneCutoffs,
} from "@/components/gauge"

const paths = (container: HTMLElement) =>
  [...container.querySelectorAll("path")].map((path) => ({
    d: path.getAttribute("d"),
    stroke: path.getAttribute("stroke"),
  }))

describe("GaugeZones", () => {
  it("draws nothing for no zones", () => {
    const { container } = render(
      <LinearGauge value={0}>
        <GaugeZones zones={[]} />
      </LinearGauge>
    )
    expect(container.querySelector("g")).toBeNull()
  })

  it("runs each zone from the last cutoff, the last one on to max", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeZones
          zones={[
            { to: 25, color: "green" },
            { to: 75, color: "amber" },
            { to: 0, color: "red" },
          ]}
        />
      </LinearGauge>
    )
    expect(paths(container)).toEqual([
      { d: "M -200 0 L -100 0", stroke: "green" },
      { d: "M -100 0 L 100 0", stroke: "amber" },
      { d: "M 100 0 L 200 0", stroke: "red" },
    ])
  })

  it("strokes the band with its defaults", () => {
    const { container } = render(
      <LinearGauge value={0}>
        <GaugeZones zones={[{ to: 0, color: "red" }]} />
      </LinearGauge>
    )
    const path = container.querySelector("path")
    expect(path?.getAttribute("stroke-width")).toBe("8")
    expect(path?.getAttribute("stroke-linecap")).toBe("butt")
    expect(path?.getAttribute("fill")).toBe("none")
    expect(container.querySelector("g")?.getAttribute("opacity")).toBe("1")
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("leaves a zone with no paint undrawn, so a band covers part of the domain", () => {
    const { container } = render(
      <LinearGauge value={0} min={4} max={12} length={400}>
        <GaugeZones
          zones={[
            { to: 11, color: "none" },
            { to: 12, color: "red" },
          ]}
          offset={18}
          width={5}
        />
      </LinearGauge>
    )
    expect(paths(container)).toEqual([
      { d: "M -200 -18 L 150 -18", stroke: "none" },
      { d: "M 150 -18 L 200 -18", stroke: "red" },
    ])
  })

  it("opens a gap between neighbours but not at the outer ends", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeZones
          gap={10}
          zones={[
            { to: 50, color: "a" },
            { to: 0, color: "b" },
          ]}
        />
      </LinearGauge>
    )
    expect(paths(container).map((p) => p.d)).toEqual([
      "M -200 0 L -5 0",
      "M 5 0 L 200 0",
    ])
  })

  it("rounds the joints with discs and the outer ends by endCap", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeZones
          width={10}
          cap="round"
          endCap="butt"
          zones={[
            { to: 50, color: "a" },
            { to: 0, color: "b" },
          ]}
        />
      </LinearGauge>
    )
    const discs = [...container.querySelectorAll("circle")].map((c) => ({
      cx: c.getAttribute("cx"),
      r: c.getAttribute("r"),
      fill: c.getAttribute("fill"),
    }))
    expect(discs).toEqual([
      { cx: "0", r: "5", fill: "a" },
      { cx: "0", r: "5", fill: "b" },
    ])
  })

  it("skips a zone squeezed to nothing by the one before", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeZones
          zones={[
            { to: 60, color: "a" },
            { to: 40, color: "b" },
            { to: 0, color: "c" },
          ]}
        />
      </LinearGauge>
    )
    expect(paths(container).map((p) => p.stroke)).toEqual(["a", "c"])
  })

  it("bends the zones round a dial", () => {
    const { container } = render(
      <Gauge value={0} startAngle={90} endAngle={270} radius={100}>
        <GaugeZones
          zones={[
            { to: 50, color: "a" },
            { to: 0, color: "b" },
          ]}
        />
      </Gauge>
    )
    expect(paths(container).map((p) => p.d)).toEqual([
      "M -100 0 A 100 100 0 0 1 0 -100",
      "M 0 -100 A 100 100 0 0 1 100 0",
    ])
  })
})

describe("zone helpers", () => {
  const zones = [
    { to: 30, color: "a" },
    { to: 70, color: "b" },
    { to: 100, color: "c" },
  ]

  it("lists the cutoffs between zones", () => {
    expect(zoneCutoffs(zones)).toEqual([30, 70])
    expect(zoneCutoffs([])).toEqual([])
  })

  it("finds the colour of the zone a value is in", () => {
    expect(zoneColor(zones, 10, "x")).toBe("a")
    expect(zoneColor(zones, 30, "x")).toBe("b")
    expect(zoneColor(zones, 99, "x")).toBe("c")
    expect(zoneColor([], 10, "x")).toBe("x")
  })
})
