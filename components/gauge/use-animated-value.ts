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

/**
 * Follows `target` with the given transition and returns the value to draw
 * this frame. With no transition it returns `target` as is and renders
 * nothing extra. Honours `prefers-reduced-motion` by snapping.
 *
 * `span` is the size of the domain and sets the rest threshold. `initial` is
 * where the value starts on mount, for a sweep-in from the minimum.
 */
export const useAnimatedValue = (
  target: number,
  transition: GaugeTransition | boolean | undefined,
  span: number,
  initial?: number
) => {
  const enabled = Boolean(transition)
  const [display, setDisplay] = useState(initial ?? target)
  const spring = useRef<SpringState>({ value: initial ?? target, velocity: 0 })

  // The config is read through a ref so an inline object or easing function
  // does not restart the animation every render; only its content matters.
  const transitionRef = useRef(transition)
  useEffect(() => {
    transitionRef.current = transition
  })
  const configKey = JSON.stringify(transition)

  // While disabled, keep the spring state in step so re-enabling animates
  // from what is on screen rather than from a stale value.
  useEffect(() => {
    if (!enabled) spring.current = { value: target, velocity: 0 }
  }, [enabled, target])

  useEffect(() => {
    const config = resolveTransition(transitionRef.current)
    if (!config) return
    const precision = Math.max(span, 1e-6) * 1e-4
    const snap = prefersReducedMotion()

    let frame = 0
    let last = performance.now()
    const from = spring.current.value
    const start = last

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let done: boolean

      if (snap) {
        spring.current = { value: target, velocity: 0 }
        done = true
      } else if (config.type === "spring") {
        const physics = springPhysics(config)
        const next = stepSpring(spring.current, target, physics, dt, precision)
        spring.current = next.state
        done = next.done
      } else {
        const duration = Math.max(config.duration ?? 0.5, 1e-3)
        const progress = Math.min((now - start) / 1000 / duration, 1)
        const eased = easingFunction(config.ease)(progress)
        const value = from + (target - from) * eased
        spring.current = { value, velocity: 0 }
        done = progress >= 1
      }

      setDisplay(spring.current.value)
      if (!done) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, configKey, span])

  return enabled ? display : target
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
