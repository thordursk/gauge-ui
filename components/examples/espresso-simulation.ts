"use client"

import { useEffect, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

/**
 * A toy espresso machine pulling one shot after another, for the espresso
 * example. The pump wets the puck at a low pressure, then builds to nine
 * bar, and the coffee flows at the pressure over the puck's resistance until
 * the cup holds the dose times the ratio. A finer grind or a bigger dose
 * resists more, so the shot runs slower; a coarse one gushes and never
 * builds full pressure, since the pump can only push so much water. Nothing
 * here is calibrated against a real machine; it only has to move the gauges
 * the way one does.
 */

export type Recipe = {
  /** Grind setting, from 1, the finest, to 20. */
  grind: number
  /** Coffee in the basket, g. */
  dose: number
  /** Coffee in the cup over coffee in the basket: 2 pulls 36 g from 18 g. */
  ratio: number
  /** The brew boiler's setpoint, °C. */
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
  /** Seconds since the pump started, held once the shot stops. */
  time: number
  /** At the group head, bar. */
  pressure: number
  /** Into the cup, g/s. */
  flow: number
  /** In the cup, g. */
  yield: number
  /** Where the shot stops: the dose times the ratio, g. */
  target: number
  /** The brew boiler, °C. */
  brewTemp: number
  /** The steam boiler, bar, and whether its element is on. */
  steam: number
  heating: boolean
  /** Water left in the tank, 0–1. */
  tank: number
  /** Shots pulled, counting the one under way. */
  shots: number
}

/** The window a shot should run in, from the pump starting, s. */
export const WINDOW = [25, 30] as const

/** The steam boiler's element cuts in below the first and out above the
    second, bar. */
export const STEAM_BAND = [1.2, 1.5] as const

/** Held at the low pressure that wets the puck this long, s. */
const PREINFUSION = 6
const PREINFUSION_PRESSURE = 3
const BREW_PRESSURE = 9

/** The most the pump can push through the puck, g/s. A coarse grind
    resists too little to build full pressure against it. */
const PUMP_FLOW = 4

/** The puck's resistance, bar per g/s, at the default grind and dose. Set
    so the default recipe lands in the middle of the window. */
const RESISTANCE = 6
/** How much each step finer multiplies the resistance. */
const GRIND_STEP = 1.12
/** The puck wears as the shot runs, its resistance falling by this share
    a second, down to the floor. */
const EROSION = 0.012
const EROSION_FLOOR = 0.7

/** Seconds of water through the puck before the first drops reach the cup. */
const SOAK = 4

/** Held on the finished shot, then on an empty cup, before the next, s. */
const DONE_HOLD = 4
const READY_HOLD = 2

/** °C the brew boiler drops a second for each g/s of cold water through it,
    and the share of the gap to its setpoint the element closes a second. */
const BREW_LOAD = 0.5
const BREW_RECOVERY = 0.6

/** The steam boiler's rise with its element on and fall with it off, bar/s. */
const STEAM_RISE = 0.08
const STEAM_FALL = 0.03

/** The tank, ml. A shot draws its yield and a little more for the flush. */
const TANK = 2000
const FLUSH = 8

type Machine = Espresso & {
  /** Seconds in the current phase. */
  clock: number
  /** How far the puck has worn, 1 when fresh. */
  wear: number
  /** Seconds of water through the puck so far. */
  soaked: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

/** Moves `value` towards `target` at `rate` per second, without overshoot. */
const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt)

const resistance = (recipe: Recipe, wear: number) =>
  RESISTANCE *
  GRIND_STEP ** (DEFAULT_RECIPE.grind - recipe.grind) *
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

/** Moves the machine on by `dt` seconds. */
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
    /* Nothing reaches the cup until the puck is soaked through, then the
       drips build to the full flow over a second or so. */
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
    /* The pump off, the last drips fall and the group bleeds down. */
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

  /* Cold water in through the shot pulls the brew boiler down; the element
     works it back to the setpoint. */
  m.brewTemp +=
    ((recipe.temp - m.brewTemp) * BREW_RECOVERY - m.flow * BREW_LOAD) * dt

  /* The steam element cycles on a band, as a pressurestat switches it. */
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

/** A shot pulled with `recipe` and stopped `at` seconds in, for reduced
    motion: still, but still answering the controls. */
const held = (recipe: Recipe, at = 20): Espresso => {
  const m = warmedUp(recipe)
  for (let t = 0; t < READY_HOLD + at; t += TICK) step(m, recipe, TICK)
  return snapshot(m)
}

/** Seconds a recipe's shot runs from the pump starting until it stops. */
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
    /* Held on the next frame rather than in the render: the server cannot
       know the preference, so both start on a warm, idle machine. */
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
