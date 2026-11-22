import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  COUNT,
  END,
  EVENTS,
  LANDING_RESERVE,
  phaseOf,
  useLaunchSimulation,
} from "@/components/examples/launch-simulation"

import { advance, onScreen, rounded, runHook, sample } from "./harness"

const TICK = 50

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("rehearsal", () => {
  it("times the same events", () => {
    expect(EVENTS).toMatchSnapshot()
  })

  it("leaves the booster the same landing reserve", () => {
    expect(LANDING_RESERVE).toBe(0.15)
  })

  it("names the same phases", () => {
    const phases = []
    for (let t = COUNT; t <= END; t += 5) phases.push(phaseOf(t))
    expect(phases).toMatchSnapshot()
  })
})

describe("useLaunchSimulation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("flies the same mission tick for tick", () => {
    onScreen()
    const { result } = runHook(useLaunchSimulation)
    const mission = sample(() => result.current, {
      every: TICK * 25,
      times: 50,
    })
    expect(mission).toMatchSnapshot()
  })

  it("marks the reserve where the booster's oxygen stands at shutdown", () => {
    onScreen()
    const { result } = runHook(useLaunchSimulation)
    while (result.current.boosterStatus === "Attached") advance(TICK)
    const { lox } = result.current.booster
    expect(Math.round(lox * 100) / 100).toBe(LANDING_RESERVE)
  })

  it("lands the booster", () => {
    onScreen()
    const { result } = runHook(useLaunchSimulation)
    const statuses = new Set<string>()
    for (let i = 0; i < 1100; i++) {
      advance(TICK)
      statuses.add(result.current.boosterStatus)
    }
    expect([...statuses]).toEqual([
      "Attached",
      "Coasting",
      "Boostback burn",
      "Entry burn",
      "Landing burn",
      "Landed",
    ])
  })

  it("holds the flight partway up for reduced motion", () => {
    onScreen({ reducedMotion: true })
    const { result } = runHook(useLaunchSimulation)
    advance(100)
    expect(rounded(result.current)).toMatchSnapshot()
  })
})
