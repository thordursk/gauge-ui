import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  BREW_BAND,
  DEFAULT_RECIPE,
  GRIND_MAX,
  GRIND_MIN,
  PREINFUSION_BAND,
  WINDOW,
  shotTime,
  useEspressoSimulation,
  type Espresso,
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

  it("clamps the grind to its range", () => {
    expect(shotTime({ ...DEFAULT_RECIPE, grind: GRIND_MIN - 5 })).toBe(
      shotTime({ ...DEFAULT_RECIPE, grind: GRIND_MIN })
    )
    expect(shotTime({ ...DEFAULT_RECIPE, grind: GRIND_MAX + 5 })).toBe(
      shotTime({ ...DEFAULT_RECIPE, grind: GRIND_MAX })
    )
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

  it("builds pressure inside the pre-infusion band before brewing", () => {
    onScreen()
    const { result } = runHook(useDefaultShot)
    const shot = sample(() => result.current, { every: TICK, times: 200 })
    const soaking = (shot as Espresso[]).filter(
      (e, i, all) =>
        e.phase === "preinfusion" && all[i + 1]?.phase === "extraction"
    )
    expect(soaking).toHaveLength(1)
    expect(soaking[0].pressure).toBeGreaterThanOrEqual(PREINFUSION_BAND[0])
    expect(soaking[0].pressure).toBeLessThanOrEqual(PREINFUSION_BAND[1])
  })

  it("holds a shot partway through for reduced motion", () => {
    onScreen({ reducedMotion: true })
    const { result } = runHook(useDefaultShot)
    advance(100)
    expect(result.current.phase).toBe("extraction")
    expect(result.current.pressure).toBeGreaterThanOrEqual(BREW_BAND[0])
    expect(result.current.pressure).toBeLessThanOrEqual(BREW_BAND[1])
    expect(rounded(result.current)).toMatchSnapshot()
  })
})
