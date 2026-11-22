import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CORNERS,
  LAP_LENGTH,
  useLapSimulation,
  type Telemetry,
} from "@/components/examples/lap-simulation"

import { onScreen, rounded, runHook, sample } from "./harness"

const TICK = 50

const published = (t: Telemetry) => ({ ...t })

beforeEach(() => {
  vi.useFakeTimers()
  onScreen()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("useLapSimulation", () => {
  it("starts from the same pre-run session every time", () => {
    const first = runHook(useLapSimulation).result.current
    const second = runHook(useLapSimulation).result.current
    expect(second).toEqual(first)
    expect(rounded(published(first))).toMatchSnapshot()
  })

  it("drives the same laps tick for tick", () => {
    const { result } = runHook(useLapSimulation)
    const laps = sample(() => published(result.current), {
      every: TICK * 40,
      times: 60,
    })
    expect(laps).toMatchSnapshot()
  })

  it("keeps the published readings inside their ranges", () => {
    const { result } = runHook(useLapSimulation)
    const readings = sample(() => result.current, { every: TICK, times: 2400 })
    for (const t of readings as Telemetry[]) {
      expect(t.gear).toBeGreaterThanOrEqual(1)
      expect(t.gear).toBeLessThanOrEqual(8)
      expect(Number.isInteger(t.gear)).toBe(true)
      expect(t.throttle).toBeGreaterThanOrEqual(0)
      expect(t.throttle).toBeLessThanOrEqual(1)
      expect(t.brake).toBeGreaterThanOrEqual(0)
      expect(t.brake).toBeLessThanOrEqual(1)
      expect(t.distance).toBeGreaterThanOrEqual(0)
      expect(t.distance).toBeLessThan(LAP_LENGTH)
      expect(t.tyres).toHaveLength(4)
    }
  })
})

describe("track", () => {
  it("marks every corner inside the lap", () => {
    expect(CORNERS.length).toBeGreaterThan(0)
    for (const at of CORNERS) {
      expect(at).toBeGreaterThan(0)
      expect(at).toBeLessThan(LAP_LENGTH)
    }
  })
})
