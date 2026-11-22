import { describe, expect, it } from "vitest"

import { foldValue, polar, valueToAngle } from "@/components/gauge"

describe("valueToAngle", () => {
  it("maps the domain onto the sweep", () => {
    expect(valueToAngle(0, 0, 100, 40, 320)).toBe(40)
    expect(valueToAngle(50, 0, 100, 40, 320)).toBe(180)
    expect(valueToAngle(100, 0, 100, 40, 320)).toBe(320)
  })

  it("clamps values outside the domain", () => {
    expect(valueToAngle(-10, 0, 100, 40, 320)).toBe(40)
    expect(valueToAngle(110, 0, 100, 40, 320)).toBe(320)
  })
})

describe("foldValue", () => {
  it("folds values back round a closed ring", () => {
    expect(foldValue(370, 0, 360)).toBe(10)
    expect(foldValue(-10, 0, 360)).toBe(350)
  })
})

describe("polar", () => {
  it("puts gauge 0° at six o'clock", () => {
    const bottom = polar(100, 0)
    const top = polar(100, 180)
    expect(bottom.x).toBeCloseTo(0)
    expect(bottom.y).toBeCloseTo(100)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-100)
  })
})
