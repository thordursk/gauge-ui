"use client"

import { useEffect, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

export type Telemetry = {
  speed: number
  rpm: number
  gear: number
  throttle: number
  brake: number
  steer: number
  distance: number
  lap: number
  lapTime: number
  lastLap: number
  bestLap: number
  delta: number
  sectors: number[]
  bestSectors: number[]
  tyres: [number, number, number, number]
  battery: number
  ers: number
  fuel: number
  clock: number
}

type Corner = {
  speed: number
  turn: 1 | -1
}

type Segment = { length: number; corner?: Corner }

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

const STARTS = TRACK.reduce<number[]>(
  (acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + TRACK[i - 1].length],
  []
)

export const LAP_LENGTH =
  STARTS[STARTS.length - 1] + TRACK[TRACK.length - 1].length

export const SECTOR_STARTS = [1500, 3000]

export const CORNERS = TRACK.flatMap((s, i) => (s.corner ? [STARTS[i]] : []))

const VMAX = 340 / 3.6
const BRAKE_PLAN = 30
const MAX_BRAKE = 36
const UPSHIFT = 11.9
const DOWNSHIFT = 8
const RATIOS = Array.from(
  { length: 8 },
  (_, g) => 120 * (35.8 / 120) ** (g / 7)
)
const SAMPLE = 25
const FULL_TANK = 40

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + clamp(to - from, -rate * dt, rate * dt)

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
  samples: number[]
  sectors: number[]
  reference: number[]
  bestSectors: number[]
  pace: number
  braking: number | null
}

const referenceAt = (reference: number[], distance: number) => {
  const at = distance / SAMPLE
  const i = Math.floor(at)
  if (i + 1 >= reference.length) return reference[reference.length - 1] ?? 0
  return reference[i] + (reference[i + 1] - reference[i]) * (at - i)
}

const step = (car: Car, dt: number, random: () => number) => {
  const v = car.speed
  const index = segmentAt(car.distance)
  const segment = TRACK[index]
  const progress = (car.distance - STARTS[index]) / segment.length

  const needs = new Map<number, number>()
  let ahead = STARTS[index] + segment.length - car.distance
  for (let k = 1; k <= 4; k++) {
    const j = (index + k) % TRACK.length
    const next = TRACK[j]
    if (next.corner) {
      const vc = (next.corner.speed / 3.6) * car.pace
      needs.set(j, (v * v - vc * vc) / (2 * Math.max(ahead, 1)))
    }
    ahead += next.length
  }
  if (car.braking !== null && !needs.has(car.braking)) car.braking = null
  if (car.braking === null) {
    for (const [j, need] of needs) {
      if (need > BRAKE_PLAN) car.braking = j
    }
  }
  const limit = segment.corner ? (segment.corner.speed / 3.6) * car.pace : VMAX

  let throttleTo = 1
  let brakeTo = 0
  if (car.braking !== null) {
    throttleTo = 0
    brakeTo = clamp((needs.get(car.braking) ?? 0) / MAX_BRAKE, 0, 1)
  } else if (v > limit + 1) {
    throttleTo = 0
    brakeTo = 1
  } else if (segment.corner) {
    throttleTo = progress < 0.45 ? 0.3 : 0.3 + (progress - 0.45) * 1.3
  }
  car.throttle = approach(car.throttle, clamp(throttleTo, 0, 1), 6, dt)
  car.brake = approach(car.brake, brakeTo, brakeTo > car.brake ? 10 : 6, dt)

  const accel =
    car.throttle * 13 * (1 - (v / VMAX) ** 2) - car.brake * MAX_BRAKE - 0.5
  car.speed = Math.max(12, v + accel * dt)
  if (segment.corner && car.speed > limit) {
    car.speed = approach(car.speed, limit, 20, dt)
  }

  const lock = segment.corner
    ? segment.corner.turn *
      clamp((300 - segment.corner.speed) / 230, 0.15, 0.95) *
      Math.sin(Math.PI * clamp(progress * 1.1, 0, 1)) ** 0.6
    : 0
  car.steer = approach(car.steer, lock, 4, dt) + (random() - 0.5) * 0.01

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

  if (car.throttle > 0.95 && car.speed * 3.6 > 140 && car.battery > 2) {
    car.ers = 120
    car.battery -= 1.5 * dt
  } else if (car.brake > 0.1) {
    car.ers = -120 * car.brake
    car.battery = Math.min(100, car.battery + 8 * car.brake * dt)
  } else {
    car.ers = 0
  }

  car.fuel -= (0.008 + car.throttle * 0.03) * dt
  if (car.fuel < 3) car.fuel = FULL_TANK

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
    braking: null,
  }
  while (car.lap === 6) step(car, TICK, random)
  for (let t = 0; t < 14; t += TICK) step(car, TICK, random)
  return { car, random }
}

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
