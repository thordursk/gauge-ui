"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

/**
 * A toy drivetrain for the car dashboard example: it pulls away, shifts up
 * through the gears, cruises, brakes and stops again, forever. Nothing here is
 * physically accurate; it only has to move the gauges the way a real drive
 * does, with the rev needle dropping on every upshift.
 */

export type DriveReadings = {
  /** km/h */
  speed: number
  /** Thousands of rpm, which is how a tachometer is labelled. */
  rpm: number
  /** 0 for neutral, 1–6 in gear. */
  gear: number
  /** Percent of a full tank. */
  fuel: number
}

/** Where the drive is up to: what the driver is doing and until when. */
type Phase =
  | { kind: "accelerate"; target: number; throttle: number }
  | { kind: "cruise"; target: number; until: number }
  | { kind: "brake"; target: number; force: number }
  | { kind: "idle"; until: number }

type DriveState = DriveReadings & {
  throttle: number
  time: number
  phase: Phase
}

/** rpm per km/h in each gear, index 0 being neutral. */
const RATIOS = [0, 130, 76, 51, 39, 31, 25]
const IDLE = 0.8
const TOP_SPEED = 240

/** Where the drive starts, and what a reduced-motion visitor is shown. */
export const PARKED: DriveReadings = {
  speed: 0,
  rpm: IDLE,
  gear: 0,
  fuel: 64,
}

const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
/** Moves `from` towards `to` by at most `rate * dt`. */
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + clamp(to - from, -rate * dt, rate * dt)

/** Whatever the driver does next once the current phase is over. */
const nextPhase = (s: DriveState): Phase => {
  const { speed } = s
  if (speed < 1) {
    return {
      kind: "accelerate",
      target: between(50, 130),
      throttle: between(0.5, 1),
    }
  }
  const faster = speed < 170 && Math.random() < 0.55
  if (faster) {
    return {
      kind: "accelerate",
      target: Math.min(speed + between(30, 70), 210),
      throttle: between(0.4, 1),
    }
  }
  /* Slowing down ends in a stop about a third of the time, as at lights. */
  const stop = Math.random() < 0.35
  return {
    kind: "brake",
    target: stop ? 0 : Math.max(30, speed - between(30, 70)),
    force: between(8, 18),
  }
}

const step = (s: DriveState, dt: number): DriveState => {
  const time = s.time + dt
  let { phase, speed, throttle } = s

  switch (phase.kind) {
    case "accelerate": {
      throttle = approach(throttle, phase.throttle, 2, dt)
      /* Pull tails off as the car nears its top speed. */
      speed += throttle * 13 * (1 - speed / TOP_SPEED) * dt
      if (speed >= phase.target) {
        phase = {
          kind: "cruise",
          target: phase.target,
          until: time + between(2, 5),
        }
      }
      break
    }
    case "cruise": {
      throttle = approach(throttle, 0.18 + speed / 900, 1.5, dt)
      speed = approach(speed, phase.target + Math.sin(time * 1.3) * 1.5, 3, dt)
      if (time >= phase.until) phase = nextPhase({ ...s, speed, time })
      break
    }
    case "brake": {
      throttle = approach(throttle, 0, 3, dt)
      speed = Math.max(phase.target, speed - phase.force * dt)
      if (speed <= phase.target) {
        phase =
          phase.target === 0
            ? { kind: "idle", until: time + between(1.5, 3) }
            : {
                kind: "cruise",
                target: phase.target,
                until: time + between(2, 4),
              }
      }
      break
    }
    case "idle": {
      throttle = approach(throttle, 0, 3, dt)
      if (time >= phase.until) phase = nextPhase({ ...s, speed, time })
      break
    }
  }

  /* Gears: neutral at a standstill, first to pull away, then up once the
     revs pass a point that climbs with the throttle and down when they sag. */
  let gear = s.gear
  if (speed < 2) gear = 0
  else if (gear === 0) gear = 1
  const revsIn = (g: number) => (speed * RATIOS[g]) / 1000
  const shiftUp = 2.3 + throttle * 3.8
  if (gear > 0 && gear < 6 && revsIn(gear) > shiftUp) gear += 1
  if (gear > 1 && revsIn(gear) < 1.3) gear -= 1

  /* The clutch slips below walking pace in first, so the engine holds revs. */
  const engine = gear === 0 ? IDLE + throttle * 1.2 : revsIn(gear)
  const rpm = clamp(
    Math.max(engine, IDLE + (gear === 1 ? throttle * 1.4 : 0)) +
      Math.sin(time * 9) * 0.02,
    0,
    8
  )

  /* A quick tank so the needle visibly moves, refilled when it runs low. */
  let fuel = s.fuel - (0.03 + throttle * 0.12) * dt
  if (fuel < 8) fuel = 100

  return {
    time,
    phase,
    throttle,
    speed,
    gear,
    rpm,
    fuel,
  }
}

const TICK = 1 / 12

/**
 * Runs the drive while `target` is on screen and returns the latest readings.
 * The gauges smooth between ticks with their own transition, so a dozen
 * updates a second is plenty. Visitors who prefer reduced motion get the car
 * parked with the engine running, and nothing moves.
 */
export const useDriveSimulation = (target: RefObject<Element | null>) => {
  const [readings, setReadings] = useState<DriveReadings>(PARKED)
  const state = useRef<DriveState>({
    ...PARKED,
    throttle: 0,
    time: 0,
    phase: { kind: "idle", until: 1.2 },
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
