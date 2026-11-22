"use client"

import { useEffect, useRef, useState } from "react"

import {
  easingFunction,
  resolveTransition,
  springPhysics,
  stepSpring,
  type GaugeTransition,
  type SpringState,
} from "./transition"

const shortestDelta = (delta: number, span: number) => {
  const s = Math.max(span, 1e-9)
  return ((((delta + s / 2) % s) + s) % s) - s / 2
}

export const useAnimatedValue = (
  target: number,
  transition: GaugeTransition | boolean | undefined,
  span: number,
  initial?: number,
  wrap?: boolean
) => {
  const enabled = Boolean(transition)
  const [display, setDisplay] = useState(initial ?? target)
  const spring = useRef<SpringState>({ value: initial ?? target, velocity: 0 })

  const start = initial ?? target
  const [series, setSeries] = useState(() => ({
    raw: target,
    goal: wrap ? start + shortestDelta(target - start, span) : target,
  }))
  if (wrap && (target !== series.raw || (!enabled && target !== series.goal))) {
    setSeries(
      enabled
        ? {
            raw: target,
            goal: series.goal + shortestDelta(target - series.raw, span),
          }
        : { raw: target, goal: target }
    )
  }
  const goal = wrap ? series.goal : target

  const transitionRef = useRef(transition)
  useEffect(() => {
    transitionRef.current = transition
  })
  const configKey = JSON.stringify(transition)

  useEffect(() => {
    if (!enabled) spring.current = { value: target, velocity: 0 }
  }, [enabled, target])

  useEffect(() => {
    const config = resolveTransition(transitionRef.current)
    if (!config) return
    const precision = Math.max(span, 1e-6) * 1e-4
    const snap = prefersReducedMotion()
    const restAt = target

    let frame = 0
    let last = performance.now()
    const from = spring.current.value
    const start = last

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let done: boolean

      if (snap) {
        done = true
      } else if (config.type === "spring") {
        const physics = springPhysics(config)
        const next = stepSpring(spring.current, goal, physics, dt, precision)
        spring.current = next.state
        done = next.done
      } else {
        const duration = Math.max(config.duration ?? 0.5, 1e-3)
        const progress = Math.min((now - start) / 1000 / duration, 1)
        const eased = easingFunction(config.ease)(progress)
        const value = from + (goal - from) * eased
        spring.current = { value, velocity: 0 }
        done = progress >= 1
      }

      if (done) {
        spring.current = { value: restAt, velocity: 0 }
        if (wrap) {
          setSeries((s) =>
            s.raw === restAt && s.goal === restAt
              ? s
              : { raw: restAt, goal: restAt }
          )
        }
      }
      setDisplay(spring.current.value)
      if (!done) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [goal, target, configKey, span, wrap])

  return enabled ? display : target
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
