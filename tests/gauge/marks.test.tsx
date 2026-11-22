import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Gauge, GaugeMarks, LinearGauge } from "@/components/gauge"

const lines = (container: HTMLElement) =>
  [...container.querySelectorAll("line")].map((line) => ({
    x1: Number(line.getAttribute("x1")),
    y1: Number(line.getAttribute("y1")),
    x2: Number(line.getAttribute("x2")),
    y2: Number(line.getAttribute("y2")),
    stroke: line.getAttribute("stroke"),
  }))

describe("GaugeMarks", () => {
  it("draws nothing without values or a count", () => {
    const { container } = render(
      <Gauge value={50}>
        <GaugeMarks />
      </Gauge>
    )
    expect(container.querySelectorAll("line")).toHaveLength(0)
  })

  it("marks each value across a dial, centred on the reference circle", () => {
    const { container } = render(
      <Gauge value={0} min={0} max={100} startAngle={90} endAngle={270}>
        <GaugeMarks values={[0, 50, 100]} length={20} />
      </Gauge>
    )
    expect(lines(container)).toEqual([
      { x1: -190, y1: 0, x2: -210, y2: 0, stroke: null },
      { x1: 0, y1: -190, x2: 0, y2: -210, stroke: null },
      { x1: 190, y1: 0, x2: 210, y2: 0, stroke: null },
    ])
  })

  it("moves the marks outward by offset", () => {
    const { container } = render(
      <Gauge value={0} startAngle={90} endAngle={270}>
        <GaugeMarks values={[50]} length={10} offset={-30} />
      </Gauge>
    )
    expect(lines(container)).toEqual([
      { x1: 0, y1: -165, x2: 0, y2: -175, stroke: null },
    ])
  })

  it("marks the values along a horizontal bar", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeMarks values={[0, 25, 100]} length={8} />
      </LinearGauge>
    )
    expect(lines(container)).toEqual([
      { x1: -200, y1: 4, x2: -200, y2: -4, stroke: null },
      { x1: -100, y1: 4, x2: -100, y2: -4, stroke: null },
      { x1: 200, y1: 4, x2: 200, y2: -4, stroke: null },
    ])
  })

  it("marks the values up a vertical bar, offset to the left", () => {
    const { container } = render(
      <LinearGauge value={0} orientation="vertical" length={200}>
        <GaugeMarks values={[0, 100]} length={8} offset={10} />
      </LinearGauge>
    )
    expect(lines(container)).toEqual([
      { x1: -6, y1: 100, x2: -14, y2: 100, stroke: null },
      { x1: -6, y1: -100, x2: -14, y2: -100, stroke: null },
    ])
  })

  it("clamps values outside the domain to its ends", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeMarks values={[-50, 150]} length={8} />
      </LinearGauge>
    )
    expect(lines(container).map((l) => l.x1)).toEqual([-200, 200])
  })

  it("cuts an open domain into equal segments, with no mark at either end", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeMarks count={4} />
      </LinearGauge>
    )
    expect(lines(container).map((l) => l.x1)).toEqual([-100, 0, 100])
  })

  it("cuts the seam of a closed ring too", () => {
    const { container } = render(
      <Gauge value={0} min={0} max={4} startAngle={180} endAngle={540}>
        <GaugeMarks count={4} length={20} />
      </Gauge>
    )
    expect(lines(container).map(({ x1, y1 }) => ({ x1, y1 }))).toEqual([
      { x1: 0, y1: -190 },
      { x1: 190, y1: 0 },
      { x1: 0, y1: 190 },
      { x1: -190, y1: 0 },
    ])
  })

  it("draws no cut for a count of one", () => {
    const { container } = render(
      <LinearGauge value={0}>
        <GaugeMarks count={1} />
      </LinearGauge>
    )
    expect(container.querySelectorAll("line")).toHaveLength(0)
  })

  it("prefers values over a count", () => {
    const { container } = render(
      <LinearGauge value={0} length={400}>
        <GaugeMarks values={[50]} count={4} />
      </LinearGauge>
    )
    expect(lines(container).map((l) => l.x1)).toEqual([0])
  })

  it("strokes the group with its defaults", () => {
    const { container } = render(
      <LinearGauge value={0}>
        <GaugeMarks values={[50]} />
      </LinearGauge>
    )
    const group = container.querySelector("g")
    expect(group?.getAttribute("stroke")).toBe("currentColor")
    expect(group?.getAttribute("stroke-width")).toBe("2")
    expect(group?.getAttribute("stroke-opacity")).toBe("1")
    expect(group?.getAttribute("stroke-linecap")).toBe("round")
    const [mark] = lines(container)
    expect(Math.abs(mark.y2 - mark.y1)).toBe(12)
  })

  it("colours each mark apart from a function of its value", () => {
    const { container } = render(
      <LinearGauge value={0}>
        <GaugeMarks
          values={[20, 80]}
          color={(v) => (v < 50 ? "green" : "red")}
          width={4}
          cap="butt"
          opacity={0.5}
        />
      </LinearGauge>
    )
    const group = container.querySelector("g")
    expect(group?.getAttribute("stroke")).toBeNull()
    expect(group?.getAttribute("stroke-width")).toBe("4")
    expect(group?.getAttribute("stroke-linecap")).toBe("butt")
    expect(group?.getAttribute("stroke-opacity")).toBe("0.5")
    expect(lines(container).map((l) => l.stroke)).toEqual(["green", "red"])
  })

  it("stands still while the value moves", () => {
    const { container, rerender } = render(
      <LinearGauge value={10}>
        <GaugeMarks values={[50]} />
      </LinearGauge>
    )
    const before = container.innerHTML
    rerender(
      <LinearGauge value={90}>
        <GaugeMarks values={[50]} />
      </LinearGauge>
    )
    expect(container.innerHTML).toBe(before)
  })
})
