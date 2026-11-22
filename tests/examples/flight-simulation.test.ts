import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CRUISING,
  useFlightSimulation,
  type FlightReadings,
} from "@/components/examples/flight-simulation"

import { onScreen, runHook, sample, seededRandom } from "./harness"

const TICK = 1000 / 12

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, "random").mockImplementation(seededRandom(42))
  onScreen()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useFlightSimulation", () => {
  it("starts in the cruise", () => {
    const { result } = runHook(useFlightSimulation)
    expect(result.current).toEqual(CRUISING)
  })

  it("flies the same clearances tick for tick", () => {
    const { result } = runHook(useFlightSimulation)
    const flight = sample(() => result.current, { every: TICK * 12, times: 90 })
    expect(flight).toMatchSnapshot()
  })

  it("takes its first clearance almost at once", () => {
    const { result } = runHook(useFlightSimulation)
    sample(() => result.current, { every: TICK, times: 6 })
    const { targetAltitude, targetHeading } = result.current
    expect([targetAltitude, targetHeading]).not.toEqual([
      CRUISING.targetAltitude,
      CRUISING.targetHeading,
    ])
  })

  it("stays inside its climb, descent and bank limits", () => {
    const { result } = runHook(useFlightSimulation)
    const flight = sample(() => result.current, { every: TICK, times: 1200 })
    for (const f of flight as FlightReadings[]) {
      expect(f.verticalSpeed).toBeLessThanOrEqual(700)
      expect(f.verticalSpeed).toBeGreaterThanOrEqual(-500)
      expect(Math.abs(f.bank)).toBeLessThanOrEqual(20.1)
    }
  })
})
