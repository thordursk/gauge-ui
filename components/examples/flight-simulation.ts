"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

/**
 * A toy light aircraft for the cockpit example: it is handed a new altitude
 * or heading every so often and flies to it, climbing, levelling off and
 * banking through turns, forever. Nothing here is aerodynamically accurate;
 * it only has to move the six instruments together the way a real flight
 * does, with the nose pitching up into a climb, the airspeed bleeding off and
 * the ball swinging out on every roll into a turn.
 */

export type FlightReadings = {
  /** Indicated airspeed, kt. */
  airspeed: number
  /** ft */
  altitude: number
  /** ft/min; positive is up. */
  verticalSpeed: number
  /** Degrees, unwrapped: it keeps counting past 360 so a dial never spins
      the long way round. */
  heading: number
  /** Degrees; positive is right wing down. */
  bank: number
  /** Degrees; positive is nose up. */
  pitch: number
  /** In standard rates (3°/s); positive is a right turn. */
  turnRate: number
  /** Ball deflection from -1 to 1; positive is out to the right. */
  slip: number
  /** Where the autopilot is taking it. */
  targetAltitude: number
  targetHeading: number
}

type FlightState = FlightReadings & { time: number; nextChange: number }

/** Where the flight starts, and what a reduced-motion visitor is shown. */
export const CRUISING: FlightReadings = {
  airspeed: 112,
  altitude: 5500,
  verticalSpeed: 0,
  heading: 270,
  bank: 0,
  pitch: 2,
  turnRate: 0,
  slip: 0,
  targetAltitude: 5500,
  targetHeading: 270,
}

const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
/** Moves `from` towards `to` by at most `rate * dt`. */
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + clamp(to - from, -rate * dt, rate * dt)

const ALTITUDES = [3500, 4500, 5500, 6500, 7500]

/** A new clearance: another altitude, a new heading, or both. */
const nextTargets = (s: FlightState) => {
  const roll = Math.random()
  const altitude =
    roll < 0.6
      ? ALTITUDES.filter((a) => a !== s.targetAltitude)[
          Math.floor(Math.random() * (ALTITUDES.length - 1))
        ]
      : s.targetAltitude
  const heading =
    roll > 0.3
      ? s.targetHeading +
        (Math.random() < 0.5 ? -1 : 1) * Math.round(between(3, 12)) * 10
      : s.targetHeading
  return { targetAltitude: altitude, targetHeading: heading }
}

const step = (s: FlightState, dt: number): FlightState => {
  const time = s.time + dt
  let { targetAltitude, targetHeading, nextChange } = s
  if (time >= nextChange) {
    ;({ targetAltitude, targetHeading } = nextTargets(s))
    nextChange = time + between(10, 18)
  }

  /* Climb at 700 ft/min and descend at 500, easing off over the last few
     hundred feet so it levels out rather than stopping dead. */
  const altitudeError = targetAltitude - s.altitude
  const vsTarget = clamp(altitudeError * 2.5, -500, 700)
  const verticalSpeed = approach(s.verticalSpeed, vsTarget, 250, dt)
  const altitude = s.altitude + (verticalSpeed / 60) * dt

  /* Slower in the climb, faster going down, a touch slower in a turn. */
  const speedTarget =
    112 - verticalSpeed * 0.03 - Math.abs(s.bank) * 0.15 + Math.sin(time) * 0.6
  const airspeed = approach(s.airspeed, speedTarget, 2, dt)

  /* Bank towards the new heading, no steeper than 20°, and roll out as it
     comes round. */
  const headingError = targetHeading - s.heading
  const bankTarget = clamp(headingError * 1.5, -20, 20)
  const bank = approach(s.bank, bankTarget, 6, dt) + Math.sin(time * 2.3) * 0.08
  const rate = (1091 * Math.tan((bank * Math.PI) / 180)) / airspeed
  const heading = s.heading + rate * dt

  /* The nose sits higher in a climb and in a turn, with a little chop. */
  const pitch =
    2 + verticalSpeed / 140 + Math.abs(bank) * 0.08 + Math.sin(time * 1.7) * 0.3

  /* Adverse yaw swings the ball out as the wings roll, then it settles. */
  const rollRate = (bank - s.bank) / dt
  const slip = approach(
    s.slip,
    clamp(rollRate * 0.05 + Math.sin(time * 0.9) * 0.08, -1, 1),
    1.5,
    dt
  )

  return {
    time,
    nextChange,
    targetAltitude,
    targetHeading,
    airspeed,
    altitude,
    verticalSpeed,
    heading,
    bank,
    pitch,
    turnRate: rate / 3,
    slip,
  }
}

const TICK = 1 / 12

/**
 * Flies while `target` is on screen and returns the latest readings, a dozen
 * times a second; the gauges smooth between ticks. Visitors who prefer
 * reduced motion get the aircraft trimmed for cruise, and nothing moves.
 */
export const useFlightSimulation = (target: RefObject<Element | null>) => {
  const [readings, setReadings] = useState<FlightReadings>(CRUISING)
  const state = useRef<FlightState>({ ...CRUISING, time: 0, nextChange: 2 })
  const visible = useInView(target)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => {
      state.current = step(state.current, TICK)
      setReadings(state.current)
    }, TICK * 1000)
    return () => window.clearInterval(id)
  }, [visible])

  return readings
}
