import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Gauge, GaugeDot, LinearGauge } from "@/components/gauge"

const discs = (container: HTMLElement) =>
  [...container.querySelectorAll("circle")].map((c) => ({
    cx: Number(c.getAttribute("cx")),
    cy: Number(c.getAttribute("cy")),
    r: Number(c.getAttribute("r")),
    fill: c.getAttribute("fill"),
  }))

describe("GaugeDot", () => {
  it("rides a dial at the value, with its defaults", () => {
    const { container } = render(
      <Gauge value={50} startAngle={90} endAngle={270}>
        <GaugeDot />
      </Gauge>
    )
    expect(discs(container)).toEqual([
      { cx: 0, cy: -200, r: 10, fill: "currentColor" },
    ])
    expect(
      container.querySelector("circle")?.getAttribute("fill-opacity")
    ).toBe("1")
  })

  it("sits at the domain's ends and is offset outward", () => {
    const at = (value: number) =>
      discs(
        render(
          <Gauge value={value} startAngle={90} endAngle={270}>
            <GaugeDot offset={-20} />
          </Gauge>
        ).container
      )[0]
    expect(at(0)).toMatchObject({ cx: -180, cy: 0 })
    expect(at(100)).toMatchObject({ cx: 180, cy: 0 })
  })

  it("rides a horizontal bar and a vertical one", () => {
    const horizontal = render(
      <LinearGauge value={75} length={400}>
        <GaugeDot radius={6} offset={10} />
      </LinearGauge>
    )
    expect(discs(horizontal.container)).toEqual([
      { cx: 100, cy: -10, r: 6, fill: "currentColor" },
    ])
    const vertical = render(
      <LinearGauge value={75} orientation="vertical" length={400}>
        <GaugeDot radius={6} offset={10} />
      </LinearGauge>
    )
    expect(discs(vertical.container)).toEqual([
      { cx: -10, cy: -100, r: 6, fill: "currentColor" },
    ])
  })

  it("draws a halo behind it", () => {
    const { container } = render(
      <LinearGauge value={50}>
        <GaugeDot radius={6} halo={3} haloColor="white" color="black" />
      </LinearGauge>
    )
    expect(discs(container).map(({ r, fill }) => ({ r, fill }))).toEqual([
      { r: 9, fill: "white" },
      { r: 6, fill: "black" },
    ])
  })

  it("rides either end of a range", () => {
    const { container } = render(
      <LinearGauge value={[25, 75]} length={400}>
        <GaugeDot end="from" />
        <GaugeDot />
      </LinearGauge>
    )
    expect(discs(container).map((d) => d.cx)).toEqual([-100, 100])
  })

  it("goes round more than once with turns", () => {
    const { container } = render(
      <Gauge value={25} startAngle={180} endAngle={540}>
        <GaugeDot turns={2} />
      </Gauge>
    )
    expect(discs(container)[0]).toMatchObject({ cx: 0, cy: 200 })
  })

  it("lands on the value at once with no transition", () => {
    const { container, rerender } = render(
      <LinearGauge value={0} length={400}>
        <GaugeDot />
      </LinearGauge>
    )
    rerender(
      <LinearGauge value={100} length={400}>
        <GaugeDot />
      </LinearGauge>
    )
    expect(discs(container)[0].cx).toBe(200)
  })
})
