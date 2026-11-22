import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Gauge, GaugeDots, GaugeInset, LinearGauge } from "@/components/gauge"

const discs = (container: HTMLElement) =>
  [...container.querySelectorAll("circle")].map((c) => ({
    cx: Number(c.getAttribute("cx")),
    cy: Number(c.getAttribute("cy")),
    r: Number(c.getAttribute("r")),
    fill: c.getAttribute("fill"),
  }))

describe("GaugeDots", () => {
  it("puts count + 1 dots across an open dial, both ends included", () => {
    const { container } = render(
      <Gauge value={0} startAngle={90} endAngle={270}>
        <GaugeDots count={2} />
      </Gauge>
    )
    expect(discs(container)).toEqual([
      { cx: -200, cy: 0, r: 4, fill: null },
      { cx: 0, cy: -200, r: 4, fill: null },
      { cx: 200, cy: 0, r: 4, fill: null },
    ])
  })

  it("fills the group with its defaults", () => {
    const { container } = render(
      <Gauge value={0}>
        <GaugeDots />
      </Gauge>
    )
    const group = container.querySelector("g")
    expect(group?.getAttribute("fill")).toBe("currentColor")
    expect(group?.getAttribute("fill-opacity")).toBe("1")
    expect(container.querySelectorAll("circle")).toHaveLength(11)
  })

  it("leaves out the dot at max on a closed ring, where it would land on min", () => {
    const { container } = render(
      <Gauge value={0} min={0} max={4} startAngle={180} endAngle={540}>
        <GaugeDots count={4} radius={10} />
      </Gauge>
    )
    expect(discs(container).map(({ cx, cy }) => ({ cx, cy }))).toEqual([
      { cx: 0, cy: -200 },
      { cx: 200, cy: 0 },
      { cx: 0, cy: 200 },
      { cx: -200, cy: 0 },
    ])
  })

  it("puts a dot at each of the values in place of a count", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeDots values={[0, 25, 100]} count={50} />
      </LinearGauge>
    )
    expect(discs(container).map((d) => d.cx)).toEqual([-200, -100, 200])
  })

  it("clamps values outside the domain to its ends", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeDots values={[-10, 120]} />
      </LinearGauge>
    )
    expect(discs(container).map((d) => d.cx)).toEqual([-200, 200])
  })

  it("lays the dots along a horizontal bar, offset upward", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeDots count={2} radius={6} offset={12} />
      </LinearGauge>
    )
    expect(discs(container).map(({ cx, cy, r }) => ({ cx, cy, r }))).toEqual([
      { cx: -200, cy: -12, r: 6 },
      { cx: 0, cy: -12, r: 6 },
      { cx: 200, cy: -12, r: 6 },
    ])
  })

  it("lays the dots up a vertical bar, offset to the left", () => {
    const { container } = render(
      <LinearGauge value={0} orientation="vertical" length={200}>
        <GaugeDots count={1} offset={12} />
      </LinearGauge>
    )
    expect(discs(container).map(({ cx, cy }) => ({ cx, cy }))).toEqual([
      { cx: -12, cy: 100 },
      { cx: -12, cy: -100 },
    ])
  })

  it("pulls the dots in from a dial's rim by offset", () => {
    const { container } = render(
      <Gauge value={0} startAngle={90} endAngle={270}>
        <GaugeDots values={[50]} offset={-50} />
      </Gauge>
    )
    expect(discs(container)[0]).toMatchObject({ cx: 0, cy: -150 })
  })

  it("colours each dot apart from a function of its value", () => {
    const { container } = render(
      <LinearGauge value={0} max={4}>
        <GaugeDots
          count={4}
          color={(v) => (v % 2 === 0 ? "even" : "odd")}
          opacity={0.4}
        />
      </LinearGauge>
    )
    const group = container.querySelector("g")
    expect(group?.getAttribute("fill")).toBeNull()
    expect(group?.getAttribute("fill-opacity")).toBe("0.4")
    expect(discs(container).map((d) => d.fill)).toEqual([
      "even",
      "odd",
      "even",
      "odd",
      "even",
    ])
  })

  it("stands still while the value moves", () => {
    const { container, rerender } = render(
      <Gauge value={10} transition={false}>
        <GaugeDots count={4} />
      </Gauge>
    )
    const before = container.innerHTML
    rerender(
      <Gauge value={90} transition={false}>
        <GaugeDots count={4} />
      </Gauge>
    )
    expect(container.innerHTML).toBe(before)
  })

  it("draws a ring of engines round a centre on a turned inset", () => {
    const ring = 8
    const spacing = 360 / ring
    const { container } = render(
      <Gauge value={0}>
        <GaugeInset
          value={0}
          max={ring}
          startAngle={180 + spacing / 2}
          endAngle={540 + spacing / 2}
        >
          <GaugeDots count={ring} radius={34} offset={-82} />
        </GaugeInset>
      </Gauge>
    )
    const dots = discs(container)
    expect(dots).toHaveLength(ring)
    for (const { cx, cy } of dots) expect(Math.hypot(cx, cy)).toBeCloseTo(118)
    expect(dots[0].cx).toBeCloseTo(
      118 * Math.sin((spacing / 2) * (Math.PI / 180))
    )
  })
})
