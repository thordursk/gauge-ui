"use client"

import { useEffect, useState, type RefObject } from "react"

import { useInView } from "@/hooks/use-in-view"

export type StageReadings = {
  altitude: number
  speed: number
  accel: number
  engines: number
  throttle: number
  lox: number
  fuel: number
}

export type Launch = {
  t: number
  q: number
  peakQ: number
  booster: StageReadings
  boosterStatus: string
  stageTwo: StageReadings
}

export const ORBIT_SPEED = 7800

export const COUNT = -5
export const END = 540

export const LANDING_RESERVE = 0.15

const G = 9.81
const IGNITION = -3
const BUCKET = [40, 80] as const
const BUCKET_THROTTLE = 0.72
const MECO = 150
export const SEPARATION = 153
const SES = 160
const FAIRING = 195
const INSERTION = 520

const BOOSTBACK = 165
const BOOSTBACK_SPEED = 100
const ENTRY_ALTITUDE = 55
const ENTRY_SPEED = 750
const BOOSTBACK_ACCEL = 5
const ENTRY_ACCEL = 3
const LANDING_ACCEL = 3.5
const LANDING_MARGIN = 0.8
const STACK_DRAG = 0.05
const BOOSTER_DRAG = 0.25

type BoosterPhase =
  "attached" | "coasting" | "boostback" | "entry" | "landing" | "landed"

type Booster = StageReadings & {
  phase: BoosterPhase
  vx: number
  vy: number
  boostbackDone: boolean
  entryDone: boolean
}

type Rocket = {
  t: number
  q: number
  peakQ: number
  stack: StageReadings
  booster: Booster
  seco: number | null
  entry: number | null
  touchdown: number | null
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt)

const fullStage = (): StageReadings => ({
  altitude: 0,
  speed: 0,
  accel: 0,
  engines: 0,
  throttle: 0,
  lox: 1,
  fuel: 1,
})

const onThePad = (): Rocket => ({
  t: COUNT,
  q: 0,
  peakQ: 0,
  stack: fullStage(),
  booster: {
    ...fullStage(),
    phase: "attached",
    vx: 0,
    vy: 0,
    boostbackDone: false,
    entryDone: false,
  },
  seco: null,
  entry: null,
  touchdown: null,
})

const pressure = (speed: number, altitude: number) =>
  (0.5 * 1.225 * Math.exp(-altitude / 8.5) * speed ** 2) / 1000

const flightPath = (t: number) => {
  const w = clamp((t - 8) / (INSERTION - 8), 0, 1)
  return (Math.PI / 2) * (1 - w) ** 2.9
}

const drain = (stage: StageReadings, rate: number, dt: number) => {
  const draw = stage.throttle * stage.engines * rate * dt
  stage.lox = Math.max(0, stage.lox - draw)
  stage.fuel = Math.max(0, stage.fuel - draw * 0.98)
}

const BOOSTER_RATE = 1 / (9 * 165)

const ascend = (r: Rocket, dt: number) => {
  const { t, stack, booster } = r

  if (t >= IGNITION && t < MECO) {
    const bucket = t > BUCKET[0] && t < BUCKET[1]
    booster.engines = clamp(Math.floor((t - IGNITION) / 0.3) + 1, 0, 9)
    booster.throttle = approach(
      booster.throttle,
      bucket ? BUCKET_THROTTLE : 1,
      4,
      dt
    )
  } else if (booster.phase === "attached") {
    booster.engines = 0
    booster.throttle = approach(booster.throttle, 0, 8, dt)
  }
  if (booster.phase === "attached") drain(booster, BOOSTER_RATE, dt)

  const burning = t >= SES && r.seco === null
  stack.engines = burning ? 1 : 0
  stack.throttle = approach(stack.throttle, burning ? 1 : 0, 4, dt)
  if (burning) drain(stack, 1 / 370, dt)

  let accel = 0
  if (t >= 0 && t < MECO) {
    accel =
      (booster.throttle * (booster.engines / 9) * 1.45) /
      (0.22 + 0.78 * booster.lox)
  } else if (burning) {
    accel = (stack.throttle * 1.12) / (0.3 + 0.7 * stack.lox)
  }

  r.q = pressure(stack.speed, stack.altitude)
  r.peakQ = Math.max(r.peakQ, r.q)
  const drag = t < SEPARATION ? r.q * STACK_DRAG : 0
  stack.accel = accel + drag / G
  if (t >= 0 && r.seco === null) {
    const gamma = flightPath(t)
    const lift = 1 - (stack.speed / ORBIT_SPEED) ** 2
    stack.speed = Math.max(
      0,
      stack.speed + (accel * G - G * Math.sin(gamma) * lift - drag) * dt
    )
    stack.altitude += (stack.speed * Math.sin(gamma) * dt) / 1000
  }
  if (burning && stack.speed >= ORBIT_SPEED) r.seco = t

  if (booster.phase === "attached") {
    const gamma = flightPath(t)
    booster.altitude = stack.altitude
    booster.speed = stack.speed
    booster.accel = stack.accel
    booster.vx = stack.speed * Math.cos(gamma)
    booster.vy = stack.speed * Math.sin(gamma)
    if (t >= SEPARATION) booster.phase = "coasting"
  }
}

const flyHome = (r: Rocket, dt: number) => {
  const b = r.booster
  if (b.phase === "attached" || b.phase === "landed") return
  const speed = Math.hypot(b.vx, b.vy)
  const height = Math.max(b.altitude * 1000, 1)
  const stopping = speed ** 2 / (2 * height)

  if (b.phase === "coasting") {
    if (!b.boostbackDone && r.t >= BOOSTBACK) b.phase = "boostback"
    else if (
      b.boostbackDone &&
      !b.entryDone &&
      b.vy < 0 &&
      b.altitude < ENTRY_ALTITUDE
    ) {
      b.phase = "entry"
      r.entry = r.t
    } else if (
      b.entryDone &&
      b.vy < 0 &&
      stopping > LANDING_ACCEL * G * LANDING_MARGIN
    ) {
      b.phase = "landing"
    }
  }
  if (b.phase === "boostback" && b.vx <= -BOOSTBACK_SPEED) {
    b.phase = "coasting"
    b.boostbackDone = true
  }
  if (b.phase === "entry" && speed <= ENTRY_SPEED) {
    b.phase = "coasting"
    b.entryDone = true
  }

  let ax = 0
  let ay = 0
  let throttle = 0
  b.engines = 0
  const against = (a: number) => {
    ax = (-b.vx / (speed || 1)) * a
    ay = (-b.vy / (speed || 1)) * a
  }
  if (b.phase === "boostback") {
    b.engines = 3
    throttle = 1
    ax = -BOOSTBACK_ACCEL * G
  } else if (b.phase === "entry") {
    b.engines = 3
    throttle = 1
    against(ENTRY_ACCEL * G)
  } else if (b.phase === "landing") {
    b.engines = 1
    const want = clamp(
      stopping + G * (-b.vy / (speed || 1)),
      0,
      LANDING_ACCEL * G
    )
    throttle = want / (LANDING_ACCEL * G)
    against(want)
  }
  b.throttle = approach(b.throttle, throttle, 8, dt)
  drain(b, BOOSTER_RATE, dt)

  const drag = pressure(speed, b.altitude) * BOOSTER_DRAG
  const dx = (-b.vx / (speed || 1)) * drag
  const dy = (-b.vy / (speed || 1)) * drag
  b.accel = Math.hypot(ax + dx, ay + dy) / G
  b.vx += (ax + dx) * dt
  b.vy += (ay + dy - G) * dt
  b.altitude += (b.vy * dt) / 1000
  b.speed = Math.hypot(b.vx, b.vy)

  if (b.altitude <= 0 || (b.phase === "landing" && b.speed < 2)) {
    Object.assign(b, {
      phase: "landed",
      altitude: 0,
      speed: 0,
      accel: 0,
      vx: 0,
      vy: 0,
      engines: 0,
      throttle: 0,
    })
    r.touchdown = r.t
  }
}

const SUBSTEP = 0.05

const substep = (r: Rocket, dt: number) => {
  ascend(r, dt)
  flyHome(r, dt)
  r.t += dt
}

const fly = (r: Rocket, seconds: number) => {
  for (let left = seconds; left > 1e-9; left -= SUBSTEP) {
    substep(r, Math.min(SUBSTEP, left))
  }
}

const rehearsal = (() => {
  const r = onThePad()
  let maxQ = 0
  while (r.t < END) {
    fly(r, SUBSTEP)
    if (r.q >= r.peakQ && r.t < MECO) maxQ = r.t
  }
  return {
    maxQ: Math.round(maxQ),
    seco: Math.round(r.seco ?? INSERTION),
    entry: Math.round(r.entry ?? END),
    touchdown: Math.round(r.touchdown ?? END),
  }
})()

export type FlightEvent = {
  name: string
  t: number
  booster?: boolean
}

export const EVENTS: FlightEvent[] = [
  { name: "Liftoff", t: 0 },
  { name: "Max-Q", t: rehearsal.maxQ },
  { name: "MECO", t: MECO },
  { name: "SES", t: SES },
  { name: "Fairing", t: FAIRING },
  { name: "Boostback", t: BOOSTBACK, booster: true },
  { name: "Entry burn", t: rehearsal.entry, booster: true },
  { name: "Landing", t: rehearsal.touchdown, booster: true },
  { name: "SECO", t: rehearsal.seco },
].sort((a, b) => a.t - b.t)

export const phaseOf = (t: number) => {
  if (t < IGNITION) return "Terminal count"
  if (t < 0) return "Ignition"
  if (t < BUCKET[0]) return "Liftoff"
  if (t < BUCKET[1]) return "Throttled down through max-Q"
  if (t < MECO) return "Booster ascent"
  if (t < SES) return "Stage separation"
  if (t < rehearsal.seco) return "Second stage burn"
  return "In orbit"
}

const BOOSTER_STATUS: Record<BoosterPhase, string> = {
  attached: "Attached",
  coasting: "Coasting",
  boostback: "Boostback burn",
  entry: "Entry burn",
  landing: "Landing burn",
  landed: "Landed",
}

const snapshot = (r: Rocket): Launch => ({
  t: r.t,
  q: r.q,
  peakQ: r.peakQ,
  booster: { ...r.booster },
  boosterStatus: BOOSTER_STATUS[r.booster.phase],
  stageTwo: { ...r.stack },
})

const TICK = 1 / 20
export const WARP = 10
const HOLD = 60

const STILL = (() => {
  const r = onThePad()
  fly(r, 200 - COUNT)
  return snapshot(r)
})()

export const useLaunchSimulation = (target: RefObject<Element | null>) => {
  const [rocket] = useState(() => ({ current: onThePad() }))
  const [launch, setLaunch] = useState(() => snapshot(rocket.current))
  const visible = useInView(target)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setLaunch(STILL))
      return () => cancelAnimationFrame(frame)
    }
    const id = window.setInterval(() => {
      const r = rocket.current
      fly(r, r.t < 0 ? TICK : TICK * WARP)
      if (r.t > END + HOLD) rocket.current = onThePad()
      setLaunch(snapshot(rocket.current))
    }, TICK * 1000)
    return () => window.clearInterval(id)
  }, [visible, rocket])

  return launch
}
