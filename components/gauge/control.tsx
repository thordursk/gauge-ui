"use client"

import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { angleToValue, clamp, foldValue, valueToAngle } from "./math"
import type { GaugeRange } from "./context"
import type { GaugeOrientation } from "./scale"

const FACE = 0.55

const HUB = 0.08

const angleAt = (el: HTMLElement, x: number, y: number) => {
  const box = el.getBoundingClientRect()
  const dx = x - (box.left + box.width / 2)
  const dy = y - (box.top + box.height / 2)
  const theta = (Math.atan2(dy, dx) * 180) / Math.PI
  return {
    angle: (((theta - 90) % 360) + 360) % 360,
    reach: Math.hypot(dx, dy) / (box.width / 2),
  }
}

const positionAt = (
  el: HTMLElement,
  x: number,
  y: number,
  orientation: GaugeOrientation
) => {
  const ctm = el.querySelector("svg")?.getScreenCTM()
  if (!ctm) return 0
  const p = new DOMPoint(x, y).matrixTransform(ctm.inverse())
  return orientation === "vertical" ? -p.y : p.x
}

const turnBetween = (a: number, b: number) =>
  Math.abs(((((a - b) % 360) + 540) % 360) - 180)

type Widen<V> = V extends number ? number : [number, number]

export type GaugeControlProps<V extends number | GaugeRange = number> = {
  value: V
  onChange: (value: Widen<V>) => void
  onPress?: () => void
  min?: number
  max?: number
  step?: number
  startAngle?: number
  endAngle?: number
  orientation?: GaugeOrientation
  length?: number
  wrap?: boolean
  label: string
  thumbLabels?: readonly [string, string]
  valueText?: V extends number ? string : readonly [string, string]
  knob?: boolean
  disabled?: boolean
  className?: string
  children: ReactNode
}

export const GaugeControl = <V extends number | GaugeRange = number>({
  value,
  onChange,
  onPress,
  min = 0,
  max = 100,
  step = 1,
  startAngle = 40,
  endAngle = 320,
  orientation,
  length = 400,
  wrap = false,
  label,
  thumbLabels,
  valueText,
  knob = false,
  disabled = false,
  className,
  children,
}: GaugeControlProps<V>) => {
  const range = typeof value !== "number"
  const ends: number[] = range ? [...(value as GaugeRange)] : [value as number]
  const emit = (next: number[]) =>
    (onChange as (value: number | [number, number]) => void)(
      range ? [next[0], next[1]] : next[0]
    )

  const pressed = useRef(false)
  const active = useRef(0)
  const turn = useRef<{ at: number; base: number[]; by: number } | null>(null)
  const thumbs = useRef<(HTMLDivElement | null)[]>([])

  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const snap = (v: number) => Math.round(v / step) * step
  const settle = (v: number) => {
    const n = Number(v.toFixed(2))
    return wrap ? foldValue(n, lo, hi) : clamp(n, lo, hi)
  }

  const setEnd = (i: number, next: number) => {
    let v = settle(next)
    if (range && !wrap) {
      v = i === 0 ? Math.min(v, ends[1]) : Math.max(v, ends[0])
    }
    emit(ends.map((e, j) => (j === i ? v : e)))
  }

  const linear = orientation !== undefined
  const sweep = linear ? length : endAngle - startAngle
  const positionOf = (v: number) =>
    linear
      ? valueToAngle(v, min, max, -length / 2, length / 2)
      : valueToAngle(v, min, max, startAngle, endAngle)

  const locate = (el: HTMLElement, x: number, y: number) => {
    if (orientation) {
      return { at: positionAt(el, x, y, orientation), reach: Infinity }
    }
    const { angle, reach } = angleAt(el, x, y)
    return { at: angle, reach }
  }

  const valueAt = (at: number) =>
    snap(
      linear
        ? min + clamp((at + length / 2) / length, 0, 1) * (max - min)
        : angleToValue(at, min, max, startAngle, endAngle)
    )

  const nearest = (at: number, under: number) => {
    if (!range) return 0
    const [a, b] = ends.map((e) =>
      linear ? Math.abs(at - positionOf(e)) : turnBetween(at, positionOf(e))
    )
    if (a !== b) return a < b ? 0 : 1
    return under > ends[1] ? 1 : 0
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const el = e.currentTarget
    const { at, reach } = locate(el, e.clientX, e.clientY)
    const face = linear ? knob : reach < FACE
    if (face && knob) {
      el.setPointerCapture(e.pointerId)
      turn.current = { at, base: ends, by: 0 }
      return
    }
    if (face) {
      pressed.current = true
      return
    }
    el.setPointerCapture(e.pointerId)
    const under = valueAt(at)
    active.current = nearest(at, under)
    if (range) {
      e.preventDefault()
      const thumb = thumbs.current[active.current]
      if (thumb) {
        thumb.dataset.pointer = ""
        thumb.focus({ preventScroll: true })
      }
    }
    setEnd(active.current, under)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const t = turn.current
    if (t) {
      const { at, reach } = locate(e.currentTarget, e.clientX, e.clientY)
      if (reach < HUB) return
      const delta = linear ? at - t.at : ((at - t.at + 540) % 360) - 180
      let by = t.by + (delta / sweep) * (max - min)
      if (!wrap) {
        by = clamp(by, lo - Math.min(...t.base), hi - Math.max(...t.base))
      }
      turn.current = { ...t, at, by }
      emit(t.base.map((v) => settle(v + snap(by))))
      return
    }
    const { at } = locate(e.currentTarget, e.clientX, e.clientY)
    setEnd(active.current, valueAt(at))
  }

  const onPointerUp = () => {
    if (pressed.current) onPress?.()
    pressed.current = false
    turn.current = null
  }

  const keyDown = (i: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.pointer
    if (disabled) return
    const v = ends[i]
    const big = (max - min) / 10
    const moves: Record<string, number> = {
      ArrowUp: v + step,
      ArrowRight: v + step,
      ArrowDown: v - step,
      ArrowLeft: v - step,
      PageUp: v + big,
      PageDown: v - big,
      Home: min,
      End: max,
    }
    if (e.key in moves) {
      e.preventDefault()
      setEnd(i, moves[e.key])
    } else if ((e.key === "Enter" || e.key === " ") && onPress) {
      e.preventDefault()
      onPress()
    }
  }

  const slider = (i: number) => {
    const texts = valueText as string | readonly [string, string] | undefined
    return {
      role: "slider",
      tabIndex: disabled ? -1 : 0,
      "aria-label": range
        ? (thumbLabels?.[i] ?? `${label} ${i === 0 ? "start" : "end"}`)
        : label,
      "aria-valuemin": range && !wrap && i === 1 ? ends[0] : min,
      "aria-valuemax": range && !wrap && i === 0 ? ends[1] : max,
      "aria-valuenow": ends[i],
      "aria-valuetext": typeof texts === "string" ? texts : texts?.[i],
      "aria-orientation": orientation,
      "aria-disabled": disabled,
      onKeyDown: keyDown(i),
    }
  }

  return (
    <div
      {...(range ? { role: "group", "aria-label": label } : slider(0))}
      data-slot="gauge-control"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pressed.current = false
        turn.current = null
      }}
      className={cn(
        "relative touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-ring has-[:focus-visible:not([data-pointer])]:ring-2 has-[:focus-visible:not([data-pointer])]:ring-ring",
        linear ? "rounded-lg" : "aspect-square rounded-full",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {children}
      {range &&
        ends.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              thumbs.current[i] = el
            }}
            {...slider(i)}
            onBlur={(e) => delete e.currentTarget.dataset.pointer}
            className="sr-only"
          />
        ))}
    </div>
  )
}
