import { describe, expect, it } from "vitest"

import { arcPath, arcScale, lineScale } from "@/components/gauge"

describe("arcScale", () => {
  const ring = arcScale(100, 180, 540)
  const dial = arcScale(100, 40, 320)

  it("is closed only when it goes right round", () => {
    expect(ring.closed).toBe(true)
    expect(dial.closed).toBe(false)
  })

  it("draws a plain path between two angles", () => {
    expect(dial.path(60, 120)).toBe(arcPath(100, 60, 120))
    expect(dial.path(60, 120, 10)).toBe(arcPath(110, 60, 120))
    expect(dial.path(120, 60)).toBe("")
  })

  it("carries a wrapped path round a ring past its seam", () => {
    expect(ring.wrappedPath(500, 80)).toBe(arcPath(100, 500, 580))
    expect(ring.wrappedPath(500, 80, -20)).toBe(arcPath(80, 500, 580))
  })

  it("holds a wrapped path to one turn of the scale", () => {
    expect(ring.wrappedPath(200, 900)).toBe(arcPath(100, 200, 560))
    expect(dial.wrappedPath(60, 900)).toBe(arcPath(100, 60, 340))
  })

  it("draws nothing for a wrapped path with no length", () => {
    expect(ring.wrappedPath(200, 0)).toBe("")
    expect(ring.wrappedPath(200, -10)).toBe("")
  })
})

describe("lineScale", () => {
  const bar = lineScale("horizontal", 200)
  const column = lineScale("vertical", 200)

  it("runs centred on the origin", () => {
    expect(bar.start).toBe(-100)
    expect(bar.end).toBe(100)
    expect(bar.closed).toBe(false)
  })

  it("draws a plain path as one straight segment", () => {
    expect(bar.path(-50, 50)).toBe("M -50 0 L 50 0")
    expect(bar.path(-50, 50, 10)).toBe("M -50 -10 L 50 -10")
    expect(column.path(-50, 50)).toBe("M 0 50 L 0 -50")
    expect(bar.path(50, 150)).toBe("M 50 0 L 150 0")
    expect(bar.path(50, 50)).toBe("")
  })

  it("keeps a wrapped path that fits as one segment", () => {
    expect(bar.wrappedPath(-50, 100)).toBe("M -50 0 L 50 0")
    expect(bar.wrappedPath(0, 100)).toBe("M 0 0 L 100 0")
  })

  it("brings a wrapped path past the end back in at the start", () => {
    expect(bar.wrappedPath(60, 70)).toBe("M 60 0 L 100 0 M -100 0 L -70 0")
    expect(column.wrappedPath(60, 70, 4)).toBe(
      "M -4 -60 L -4 -100 M -4 100 L -4 70"
    )
  })

  it("holds a wrapped path to the length of the bar", () => {
    expect(bar.wrappedPath(60, 500)).toBe("M 60 0 L 100 0 M -100 0 L 60 0")
    expect(bar.wrappedPath(-100, 500)).toBe("M -100 0 L 100 0")
  })

  it("draws nothing for a wrapped path with no length", () => {
    expect(bar.wrappedPath(0, 0)).toBe("")
    expect(lineScale("horizontal", 0).wrappedPath(0, 10)).toBe("")
  })
})
