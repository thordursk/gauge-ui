import { render } from "@testing-library/react"
import { cloneElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import {
  Gauge,
  GaugeTickFill,
  LinearGauge,
  type GaugeRange,
  type GaugeTickFillProps,
} from "@/components/gauge"

const lit = (root: ReactElement, props: GaugeTickFillProps = {}) => {
  const { container } = render(
    cloneElement(
      root,
      {},
      <GaugeTickFill color="lit" dimColor="dim" {...props} />
    )
  )
  return [...container.querySelectorAll("line")]
    .map((line, i) => (line.getAttribute("stroke") === "lit" ? i : -1))
    .filter((i) => i >= 0)
}

const bar = (
  value: number | GaugeRange,
  min: number,
  max: number,
  wrap = false
) => <LinearGauge value={value} min={min} max={max} wrap={wrap} />

const ring = (value: number | GaugeRange, min: number, max: number) => (
  <Gauge
    value={value}
    min={min}
    max={max}
    startAngle={180}
    endAngle={540}
    wrap
  />
)

const upTo = (n: number) => Array.from({ length: n + 1 }, (_, i) => i)
const span = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

describe("GaugeTickFill", () => {
  it("lights every tick up to the value", () => {
    expect(lit(bar(42, 0, 100), { count: 10 })).toEqual(upTo(4))
  })

  it("lights the tick at the top of the domain", () => {
    expect(lit(bar(1, 0, 1), { count: 10 })).toEqual(upTo(10))
    expect(lit(bar(0.4, 0.1, 0.4), { count: 3 })).toEqual(upTo(3))
  })

  it("lights ticks a step of 0.1 lands on", () => {
    expect(lit(bar(0.3, 0, 1), { count: 10 })).toEqual(upTo(3))
    expect(lit(bar(0.7, 0, 1), { count: 10 })).toEqual(upTo(7))
    expect(lit(bar(0.2, 0.1, 0.4), { count: 3 })).toEqual(upTo(1))
    expect(lit(bar(0.57, 0, 1), { count: 100 })).toEqual(upTo(57))
  })

  it("lights a range whose ends land on ticks with float error", () => {
    expect(lit(bar([0.7, 1], 0, 1), { count: 10 })).toEqual(span(7, 10))
    expect(lit(bar([0.1, 0.3], 0, 1), { count: 10 })).toEqual(span(1, 3))
    expect(lit(bar(0.9, 0, 1), { count: 10, from: 0.3 })).toEqual(span(3, 9))
  })

  it("lights nothing past the value", () => {
    expect(lit(bar(0.29, 0, 1), { count: 10 })).toEqual(upTo(2))
    expect(lit(bar(0, 0, 1), { count: 10 })).toEqual([0])
  })

  it("runs forward across the seam of a wrapped ring", () => {
    expect(lit(ring([22, 6], 0, 24), { count: 24 })).toEqual([
      ...span(0, 6),
      22,
      23,
    ])
    expect(lit(ring([6, 22], 0, 24), { count: 24 })).toEqual(span(6, 22))
    expect(lit(ring([0.7, 0.2], 0, 1), { count: 10 })).toEqual([
      0, 1, 2, 7, 8, 9,
    ])
  })

  it("lights the end tick of an open wrapped bar with the start", () => {
    expect(lit(bar([0.8, 0.1], 0, 1, true), { count: 10 })).toEqual([
      0, 1, 8, 9, 10,
    ])
  })

  it("lights the tick nearest the value in nearest mode", () => {
    expect(lit(bar(42, 0, 100), { count: 10, mode: "nearest" })).toEqual([4])
    expect(lit(bar(25, 0, 100), { count: 10, mode: "nearest" })).toEqual([2])
    expect(lit(bar(100, 0, 100), { count: 10, mode: "nearest" })).toEqual([10])
    expect(lit(bar(0.7, 0, 1), { count: 10, mode: "nearest" })).toEqual([7])
  })

  it("lights one tick at each end of a range in nearest mode", () => {
    expect(
      lit(bar([0.21, 0.79], 0, 1), { count: 10, mode: "nearest" })
    ).toEqual([2, 8])
    expect(
      lit(bar(0.5, 0, 1), { count: 10, mode: "nearest", from: 0.1 })
    ).toEqual([1, 5])
  })

  it("wraps nearest round a ring", () => {
    expect(lit(ring(23.7, 0, 24), { count: 24, mode: "nearest" })).toEqual([0])
    expect(lit(ring(23.5, 0, 24), { count: 24, mode: "nearest" })).toEqual([0])
    expect(
      lit(ring([22.6, 1.2], 0, 24), { count: 24, mode: "nearest" })
    ).toEqual([1, 23])
  })

  it("draws lit ticks at their own length", () => {
    const { container } = render(
      <LinearGauge value={50} padding={0}>
        <GaugeTickFill count={2} length={10} litLength={20} />
      </LinearGauge>
    )
    const lengths = [...container.querySelectorAll("line")].map((l) =>
      Math.abs(Number(l.getAttribute("y2")) - Number(l.getAttribute("y1")))
    )
    expect(lengths).toEqual([20, 20, 10])
  })
})
