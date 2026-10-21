"use client"

import { useEffect, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

/**
 * A toy race car lapping a toy circuit, for the race telemetry example. The
 * driver brakes for every corner, carries speed through it and gets back on
 * the throttle on the way out; the gearbox, tyres, hybrid battery and fuel
 * follow along, and every lap is timed against the best one. Nothing here is
 * physically accurate; it only has to move the gauges the way a real lap
 * does, with each lap a little faster or slower than the last.
 */

export type Telemetry = {
  /** km/h */
  speed: number
  /** Thousands of rpm. */
  rpm: number
  /** 1–8. */
  gear: number
  /** Pedal travel, 0 to 1. */
  throttle: number
  brake: number
  /** Steering lock, -1 full left to 1 full right. */
  steer: number
  /** Metres into the lap. */
  distance: number
  lap: number
  /** Seconds into the lap. */
  lapTime: number
  lastLap: number
  bestLap: number
  /** Seconds behind the best lap at this point of it; negative is ahead. */
  delta: number
  /** Times of the sectors done so far this lap. */
  sectors: number[]
  /** The best lap's sector times, to compare against. */
  bestSectors: number[]
  /** °C, front left, front right, rear left, rear right. */
  tyres: [number, number, number, number]
  /** Hybrid battery charge, percent. */
  battery: number
  /** kW out of the hybrid system: deploying positive, harvesting negative. */
  ers: number
  /** kg left in the tank. */
  fuel: number
  /** Seconds since the session started, for anything that blinks. */
  clock: number
}

type Corner = {
  /** The speed the corner is taken at, km/h. */
  speed: number
  /** 1 for a right-hander, -1 for a left. */
  turn: 1 | -1
}

type Segment = { length: number; corner?: Corner }

/** The circuit: straights and corners, starting at the line. */
const TRACK: Segment[] = [
  { length: 820 },
  { length: 120, corner: { speed: 95, turn: 1 } },
  { length: 380 },
  { length: 160, corner: { speed: 180, turn: -1 } },
  { length: 90, corner: { speed: 165, turn: 1 } },
  { length: 520 },
  { length: 200, corner: { speed: 235, turn: 1 } },
  { length: 300 },
  { length: 110, corner: { speed: 110, turn: -1 } },
  { length: 640 },
  { length: 130, corner: { speed: 80, turn: 1 } },
  { length: 260 },
  { length: 150, corner: { speed: 145, turn: -1 } },
  { length: 180, corner: { speed: 200, turn: 1 } },
  { length: 340 },
]

/** Where each segment starts, metres from the line. */
const STARTS = TRACK.reduce<number[]>(
  (acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + TRACK[i - 1].length],
  []
)

export const LAP_LENGTH =
  STARTS[STARTS.length - 1] + TRACK[TRACK.length - 1].length

/** Where each sector after the first begins. */
export const SECTOR_STARTS = [1500, 3000]

/** Where every corner begins, for marking them on the lap. */
export const CORNERS = TRACK.flatMap((s, i) => (s.corner ? [STARTS[i]] : []))

/** Top speed, m/s. */
const VMAX = 340 / 3.6
/** The deceleration the driver plans braking points around, m/s². */
const BRAKE_PLAN = 30
/** Shift points, thousands of rpm. */
const UPSHIFT = 11.9
const DOWNSHIFT = 8
/** rpm per km/h in each gear, first to eighth, spaced evenly in ratio. */
const RATIOS = Array.from(
  { length: 8 },
  (_, g) => 120 * (35.8 / 120) ** (g / 7)
)
/** Metres between the timing samples a lap is compared on. */
const SAMPLE = 25
const FULL_TANK = 40

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
/** Moves `from` towards `to` by at most `rate * dt`. */
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + clamp(to - from, -rate * dt, rate * dt)

/**
 * A small seeded generator, so the session plays out the same on the server
 * and the client and the first frame hydrates cleanly.
 */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const segmentAt = (distance: number) => {
  let i = STARTS.length - 1
  while (i > 0 && STARTS[i] > distance) i -= 1
  return i
}

const rpmIn = (gear: number, speed: number) =>
  (speed * 3.6 * RATIOS[gear - 1]) / 1000

type Car = {
  distance: number
  /** m/s */
  speed: number
  throttle: number
  brake: number
  steer: number
  gear: number
  rpm: number
  tyres: [number, number, number, number]
  battery: number
  ers: number
  fuel: number
  clock: number
  lap: number
  lapTime: number
  lastLap: number
  bestLap: number
  /** This lap's time at every sample point. */
  samples: number[]
  sectors: number[]
  /** The best lap's samples and sectors. */
  reference: number[]
  bestSectors: number[]
  /** How hard the driver is pushing this lap: corner speeds scale by it. */
  pace: number
}

/** Seconds into the best lap at a distance, between its samples. */
const referenceAt = (reference: number[], distance: number) => {
  const at = distance / SAMPLE
  const i = Math.floor(at)
  if (i + 1 >= reference.length) return reference[reference.length - 1] ?? 0
  return reference[i] + (reference[i + 1] - reference[i]) * (at - i)
}

/** One step of the driver, the car and the timing. */
const step = (car: Car, dt: number, random: () => number) => {
  const v = car.speed
  const index = segmentAt(car.distance)
  const segment = TRACK[index]
  const progress = (car.distance - STARTS[index]) / segment.length

  /* Brake when a corner ahead could not be made at the planned rate. */
  let brakeFor = false
  let ahead = STARTS[index] + segment.length - car.distance
  for (let k = 1; k <= 4; k++) {
    const next = TRACK[(index + k) % TRACK.length]
    if (next.corner) {
      const vc = (next.corner.speed / 3.6) * car.pace
      if (v > vc && (v * v - vc * vc) / (2 * ahead) > BRAKE_PLAN) {
        brakeFor = true
      }
    }
    ahead += next.length
  }
  const limit = segment.corner ? (segment.corner.speed / 3.6) * car.pace : VMAX

  /* Off the throttle and hard on the brake into a corner, a balanced
     throttle through its apex, and building it back on the way out. */
  let throttleTo = 1
  let brakeTo = 0
  if (brakeFor || v > limit + 1) {
    throttleTo = 0
    brakeTo = 1
  } else if (segment.corner) {
    throttleTo = progress < 0.45 ? 0.3 : 0.3 + (progress - 0.45) * 1.3
  }
  car.throttle = approach(car.throttle, clamp(throttleTo, 0, 1), 6, dt)
  car.brake = approach(car.brake, brakeTo, brakeTo > car.brake ? 10 : 6, dt)

  const accel = car.throttle * 13 * (1 - (v / VMAX) ** 2) - car.brake * 36 - 0.5
  car.speed = Math.max(12, v + accel * dt)
  /* Grip holds the car to the corner's speed. */
  if (segment.corner && car.speed > limit) {
    car.speed = approach(car.speed, limit, 20, dt)
  }

  /* Lock grows the slower the corner, easing in and out of it. */
  const lock = segment.corner
    ? segment.corner.turn *
      clamp((300 - segment.corner.speed) / 230, 0.15, 0.95) *
      Math.sin(Math.PI * clamp(progress * 1.1, 0, 1)) ** 0.6
    : 0
  car.steer = approach(car.steer, lock, 4, dt) + (random() - 0.5) * 0.01

  /* Up a gear at the top of the revs, down when they sag. */
  if (car.gear < 8 && rpmIn(car.gear, car.speed) > UPSHIFT) car.gear += 1
  if (
    car.gear > 1 &&
    rpmIn(car.gear, car.speed) < DOWNSHIFT &&
    rpmIn(car.gear - 1, car.speed) < UPSHIFT - 0.4
  ) {
    car.gear -= 1
  }
  car.rpm = clamp(
    rpmIn(car.gear, car.speed) + (random() - 0.5) * 0.06,
    3.5,
    12.2
  )

  /* Tyres warm with work: the fronts under braking, the rears under power,
     the outside pair through a corner; and cool back on the straights. */
  const lateral = car.steer * (car.speed / 70)
  const right = Math.max(0, lateral)
  const left = Math.max(0, -lateral)
  const traction = car.throttle * (car.speed / 90)
  const targets = [
    88 + car.brake * 16 + right * 20 + left * 6,
    88 + car.brake * 16 + left * 20 + right * 6,
    90 + traction * 9 + right * 16 + left * 5,
    90 + traction * 9 + left * 16 + right * 5,
  ]
  car.tyres = car.tyres.map(
    (t, i) => t + (targets[i] - t) * 0.25 * dt
  ) as Car["tyres"]

  /* The hybrid deploys on the straights at full throttle and harvests
     under braking. */
  if (car.throttle > 0.95 && car.speed * 3.6 > 140 && car.battery > 2) {
    car.ers = 120
    car.battery -= 1.5 * dt
  } else if (car.brake > 0.1) {
    car.ers = -120 * car.brake
    car.battery = Math.min(100, car.battery + 8 * car.brake * dt)
  } else {
    car.ers = 0
  }

  /* A short stint, so the tank visibly drains; refuelled when it is low. */
  car.fuel -= (0.008 + car.throttle * 0.03) * dt
  if (car.fuel < 3) car.fuel = FULL_TANK

  /* Timing. */
  car.clock += dt
  car.lapTime += dt
  car.distance += car.speed * dt
  while (car.samples.length * SAMPLE <= car.distance) {
    car.samples.push(car.lapTime)
  }
  const nextSector = SECTOR_STARTS[car.sectors.length]
  if (nextSector !== undefined && car.distance >= nextSector) {
    const done = car.sectors.reduce((sum, s) => sum + s, 0)
    car.sectors.push(car.lapTime - done)
  }
  if (car.distance >= LAP_LENGTH) {
    const done = car.sectors.reduce((sum, s) => sum + s, 0)
    car.sectors.push(car.lapTime - done)
    car.lastLap = car.lapTime
    if (car.lapTime < car.bestLap) {
      car.bestLap = car.lapTime
      car.reference = car.samples
      car.bestSectors = car.sectors
    }
    car.lap += 1
    car.distance -= LAP_LENGTH
    car.lapTime = 0
    car.samples = []
    car.sectors = []
    /* Some laps the driver finds time, some they lose it. */
    car.pace = 0.98 + random() * 0.045
  }
}

const readings = (car: Car): Telemetry => ({
  speed: car.speed * 3.6,
  rpm: car.rpm,
  gear: car.gear,
  throttle: car.throttle,
  brake: car.brake,
  steer: car.steer,
  distance: car.distance,
  lap: car.lap,
  lapTime: car.lapTime,
  lastLap: car.lastLap,
  bestLap: car.bestLap,
  delta: car.lapTime - referenceAt(car.reference, car.distance),
  sectors: [...car.sectors],
  bestSectors: car.bestSectors,
  tyres: car.tyres,
  battery: car.battery,
  ers: car.ers,
  fuel: car.fuel,
  clock: car.clock,
})

const TICK = 1 / 20

/**
 * A session already under way: one flying lap at an even pace sets the
 * reference, and the car is a little way into the next when the page opens.
 */
const startSession = () => {
  const random = seeded(7)
  const car: Car = {
    distance: 0,
    speed: 280 / 3.6,
    throttle: 1,
    brake: 0,
    steer: 0,
    gear: 7,
    rpm: 11,
    tyres: [92, 92, 94, 94],
    battery: 62,
    ers: 0,
    fuel: 31,
    clock: 0,
    lap: 6,
    lapTime: 0,
    lastLap: Infinity,
    bestLap: Infinity,
    samples: [],
    sectors: [],
    reference: [],
    bestSectors: [],
    pace: 1,
  }
  while (car.lap === 6) step(car, TICK, random)
  for (let t = 0; t < 14; t += TICK) step(car, TICK, random)
  return { car, random }
}

/**
 * Runs the session while `target` is on screen and returns the latest
 * readings, twenty times a second. Visitors who prefer reduced motion see
 * the car held where the session starts.
 */
export const useLapSimulation = (target: RefObject<Element | null>) => {
  const [session] = useState(startSession)
  const [telemetry, setTelemetry] = useState(() => readings(session.car))
  const visible = useInView(target)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => {
      step(session.car, TICK, session.random)
      setTelemetry(readings(session.car))
    }, TICK * 1000)
    return () => window.clearInterval(id)
  }, [visible, session])

  return telemetry
}
