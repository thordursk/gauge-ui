"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

export type FlightReadings = {
  airspeed: number
  altitude: number
  verticalSpeed: number
  heading: number
  bank: number
  pitch: number
  turnRate: number
  slip: number
  targetAltitude: number
  targetHeading: number
}

type FlightState = FlightReadings & { time: number; nextChange: number }

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
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + clamp(to - from, -rate * dt, rate * dt)

const ALTITUDES = [3500, 4500, 5500, 6500, 7500]

export const CLIMB = 700
export const DESCENT = 500
const LEVEL_OFF = 2.5
export const MAX_BANK = 20
const FIRST_CLEARANCE = 0.4

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

  const altitudeError = targetAltitude - s.altitude
  const vsTarget = clamp(altitudeError * LEVEL_OFF, -DESCENT, CLIMB)
  const verticalSpeed = approach(s.verticalSpeed, vsTarget, 250, dt)
  const altitude = s.altitude + (verticalSpeed / 60) * dt

  const speedTarget =
    112 - verticalSpeed * 0.03 - Math.abs(s.bank) * 0.15 + Math.sin(time) * 0.6
  const airspeed = approach(s.airspeed, speedTarget, 2, dt)

  const headingError = targetHeading - s.heading
  const bankTarget = clamp(headingError * 1.5, -MAX_BANK, MAX_BANK)
  const bank = approach(s.bank, bankTarget, 6, dt) + Math.sin(time * 2.3) * 0.08
  const rate = (1091 * Math.tan((bank * Math.PI) / 180)) / airspeed
  const heading = s.heading + rate * dt

  const pitch =
    2 + verticalSpeed / 140 + Math.abs(bank) * 0.08 + Math.sin(time * 1.7) * 0.3

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

export const useFlightSimulation = (target: RefObject<Element | null>) => {
  const [readings, setReadings] = useState<FlightReadings>(CRUISING)
  const state = useRef<FlightState>({
    ...CRUISING,
    time: 0,
    nextChange: FIRST_CLEARANCE,
  })
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
