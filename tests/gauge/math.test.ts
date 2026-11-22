import { describe, expect, it } from "vitest"

import { foldValue, polar, valueToAngle } from "@/components/gauge"
import {
  screenToGaugeDegrees,
  signedTurn,
  turnBetween,
} from "@/components/gauge/math"

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

describe("screenToGaugeDegrees", () => {
  it("is the inverse of polar", () => {
    for (const angle of [0, 1, 45, 90, 135, 179.5, 180, 270, 359]) {
      const p = polar(100, angle)
      expect(screenToGaugeDegrees(p.x, p.y)).toBeCloseTo(angle, 2)
    }
  })

  it("puts six o'clock at 0° and goes clockwise", () => {
    expect(screenToGaugeDegrees(0, 1)).toBe(0)
    expect(screenToGaugeDegrees(-1, 0)).toBe(90)
    expect(screenToGaugeDegrees(0, -1)).toBe(180)
    expect(screenToGaugeDegrees(1, 0)).toBe(270)
  })

  it("stays in [0, 360) either side of six o'clock", () => {
    expect(screenToGaugeDegrees(-0.01, 1)).toBeGreaterThan(0)
    expect(screenToGaugeDegrees(-0.01, 1)).toBeLessThan(1)
    expect(screenToGaugeDegrees(0.01, 1)).toBeGreaterThan(359)
    expect(screenToGaugeDegrees(0.01, 1)).toBeLessThan(360)
  })
})

describe("signedTurn", () => {
  it("is positive clockwise and negative anticlockwise", () => {
    expect(signedTurn(40, 100)).toBe(60)
    expect(signedTurn(100, 40)).toBe(-60)
  })

  it("crosses six o'clock the short way", () => {
    expect(signedTurn(350, 10)).toBe(20)
    expect(signedTurn(10, 350)).toBe(-20)
  })

  it("takes angles past 360 and below 0", () => {
    expect(signedTurn(530, 10)).toBe(-160)
    expect(signedTurn(-10, 10)).toBe(20)
    expect(signedTurn(-370, 370)).toBe(20)
    expect(signedTurn(0, 720)).toBe(0)
  })

  it("calls a half turn -180", () => {
    expect(signedTurn(0, 180)).toBe(-180)
    expect(signedTurn(180, 0)).toBe(-180)
  })
})

describe("turnBetween", () => {
  it("is the unsigned short way between two angles", () => {
    expect(turnBetween(350, 10)).toBe(20)
    expect(turnBetween(10, 350)).toBe(20)
    expect(turnBetween(0, 180)).toBe(180)
    expect(turnBetween(-90, 450)).toBe(180)
    expect(turnBetween(720, 0)).toBe(0)
  })
})
