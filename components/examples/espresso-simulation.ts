"use client"

import { useEffect, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

export type Recipe = {
  grind: number
  dose: number
  ratio: number
  temp: number
}

export const DEFAULT_RECIPE: Recipe = {
  grind: 10,
  dose: 18,
  ratio: 2,
  temp: 93,
}

export type ShotPhase = "ready" | "preinfusion" | "extraction" | "done"

export type Espresso = {
  phase: ShotPhase
  time: number
  pressure: number
  flow: number
  yield: number
  target: number
  brewTemp: number
  steam: number
  heating: boolean
  tank: number
  shots: number
}

export const WINDOW = [25, 30] as const

export const STEAM_BAND = [1.2, 1.5] as const

export const GRIND_MIN = 1
export const GRIND_MAX = 20

const PREINFUSION = 6
const PREINFUSION_PRESSURE = 3
const BREW_PRESSURE = 9

const band = (pressure: number) => [pressure - 1, pressure + 1] as const

export const PREINFUSION_BAND = band(PREINFUSION_PRESSURE)
export const BREW_BAND = band(BREW_PRESSURE)

const PUMP_FLOW = 4

const RESISTANCE = 6
const GRIND_STEP = 1.12
const EROSION = 0.012
const EROSION_FLOOR = 0.7

const SOAK = 4

const DONE_HOLD = 4
const READY_HOLD = 2

const BREW_LOAD = 0.5
const BREW_RECOVERY = 0.6

const STEAM_RISE = 0.08
const STEAM_FALL = 0.03

const TANK = 2000
const FLUSH = 8

type Machine = Espresso & {
  clock: number
  wear: number
  soaked: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt)

const resistance = (recipe: Recipe, wear: number) =>
  RESISTANCE *
  GRIND_STEP **
    (DEFAULT_RECIPE.grind - clamp(recipe.grind, GRIND_MIN, GRIND_MAX)) *
  (recipe.dose / DEFAULT_RECIPE.dose) ** 1.5 *
  wear

const warmedUp = (recipe: Recipe): Machine => ({
  phase: "ready",
  time: 0,
  pressure: 0,
  flow: 0,
  yield: 0,
  target: recipe.dose * recipe.ratio,
  brewTemp: recipe.temp,
  steam: 1.35,
  heating: false,
  tank: 0.72,
  shots: 0,
  clock: 0,
  wear: 1,
  soaked: 0,
})

const step = (m: Machine, recipe: Recipe, dt: number) => {
  m.clock += dt
  m.target = recipe.dose * recipe.ratio

  if (m.phase === "ready") {
    m.pressure = approach(m.pressure, 0, 4, dt)
    if (m.clock >= READY_HOLD) {
      m.phase = "preinfusion"
      m.clock = 0
      m.time = 0
      m.yield = 0
      m.wear = 1
      m.soaked = 0
      m.shots += 1
      m.tank = Math.max(0, m.tank - FLUSH / TANK)
    }
  }

  if (m.phase === "preinfusion" || m.phase === "extraction") {
    m.time += dt
    const r = resistance(recipe, m.wear)
    const wanted =
      m.phase === "preinfusion" ? PREINFUSION_PRESSURE : BREW_PRESSURE
    m.pressure = approach(m.pressure, Math.min(wanted, PUMP_FLOW * r), 2.5, dt)
    m.soaked += dt
    const through = m.soaked > SOAK ? m.pressure / r : 0
    m.flow = approach(m.flow, through, 2, dt)
    if (m.phase === "extraction")
      m.wear = Math.max(EROSION_FLOOR, m.wear - EROSION * dt)
    if (m.phase === "preinfusion" && m.clock >= PREINFUSION) {
      m.phase = "extraction"
      m.clock = 0
    }
    if (m.yield >= m.target) {
      m.phase = "done"
      m.clock = 0
    }
  } else {
    m.flow = approach(m.flow, 0, 3, dt)
    m.pressure = approach(m.pressure, 0, 3, dt)
  }

  m.yield += m.flow * dt
  m.tank = Math.max(0, m.tank - (m.flow * dt) / TANK)

  if (m.phase === "done" && m.clock >= DONE_HOLD) {
    m.phase = "ready"
    m.clock = 0
    m.time = 0
    m.yield = 0
  }

  m.brewTemp +=
    ((recipe.temp - m.brewTemp) * BREW_RECOVERY - m.flow * BREW_LOAD) * dt

  if (m.steam < STEAM_BAND[0]) m.heating = true
  if (m.steam > STEAM_BAND[1]) m.heating = false
  m.steam = clamp(m.steam + (m.heating ? STEAM_RISE : -STEAM_FALL) * dt, 0, 2)
}

const snapshot = (m: Machine): Espresso => ({
  phase: m.phase,
  time: m.time,
  pressure: m.pressure,
  flow: m.flow,
  yield: m.yield,
  target: m.target,
  brewTemp: m.brewTemp,
  steam: m.steam,
  heating: m.heating,
  tank: m.tank,
  shots: m.shots,
})

const TICK = 1 / 20

const held = (recipe: Recipe, at = 20): Espresso => {
  const m = warmedUp(recipe)
  for (let t = 0; t < READY_HOLD + at; t += TICK) step(m, recipe, TICK)
  return snapshot(m)
}

export const shotTime = (recipe: Recipe) => {
  const m = warmedUp(recipe)
  while (m.phase !== "done" && m.time < 120) step(m, recipe, TICK)
  return m.time
}

export const useEspressoSimulation = (
  target: RefObject<Element | null>,
  recipe: Recipe
) => {
  const [machine] = useState(() => ({ current: warmedUp(DEFAULT_RECIPE) }))
  const [espresso, setEspresso] = useState(() => snapshot(machine.current))
  const visible = useInView(target)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setEspresso(held(recipe)))
      return () => cancelAnimationFrame(frame)
    }
    const id = window.setInterval(() => {
      step(machine.current, recipe, TICK)
      setEspresso(snapshot(machine.current))
    }, TICK * 1000)
    return () => window.clearInterval(id)
  }, [visible, recipe, machine])

  return espresso
}
