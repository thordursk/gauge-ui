import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_RECIPE,
  WINDOW,
  shotTime,
  useEspressoSimulation,
  type Recipe,
} from "@/components/examples/espresso-simulation"

import { advance, onScreen, rounded, runHook, sample } from "./harness"

const TICK = 50

const useDefaultShot = (target: { current: Element | null }) =>
  useEspressoSimulation(target, DEFAULT_RECIPE)

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("shotTime", () => {
  it("lands the default recipe in the window", () => {
    const time = shotTime(DEFAULT_RECIPE)
    expect(time).toBeGreaterThanOrEqual(WINDOW[0])
    expect(time).toBeLessThanOrEqual(WINDOW[1])
  })

  it("runs fast on a coarser grind and slow on a finer one", () => {
    const coarse = shotTime({ ...DEFAULT_RECIPE, grind: 14 })
    const fine = shotTime({ ...DEFAULT_RECIPE, grind: 6 })
    expect(coarse).toBeLessThan(WINDOW[0])
    expect(fine).toBeGreaterThan(WINDOW[1])
  })

  it("times the same shots as before", () => {
    const recipes: Recipe[] = [
      DEFAULT_RECIPE,
      { ...DEFAULT_RECIPE, grind: 1 },
      { ...DEFAULT_RECIPE, grind: 20 },
      { ...DEFAULT_RECIPE, dose: 20, ratio: 2.5 },
      { ...DEFAULT_RECIPE, temp: 90 },
    ]
    expect(recipes.map((r) => rounded(shotTime(r)))).toMatchSnapshot()
  })
})

describe("useEspressoSimulation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("pulls the same shots tick for tick", () => {
    onScreen()
    const { result } = runHook(useDefaultShot)
    const shots = sample(() => result.current, { every: TICK * 10, times: 90 })
    expect(shots).toMatchSnapshot()
  })

  it("holds a shot partway through for reduced motion", () => {
    onScreen({ reducedMotion: true })
    const { result } = runHook(useDefaultShot)
    advance(100)
    expect(result.current.phase).toBe("extraction")
    expect(rounded(result.current)).toMatchSnapshot()
  })
})
