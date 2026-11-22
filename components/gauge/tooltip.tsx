"use client"

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { foldValue } from "./math"

import { useGauge } from "./context"

export type GaugeTooltipPosition =
  | "pointer"
  | "value"
  | "center"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

export type GaugeTooltipSide =
  "auto" | "center" | "top" | "right" | "bottom" | "left"

export type GaugeTooltipProps = {
  position?: GaugeTooltipPosition
  side?: GaugeTooltipSide
  at?: number
  offset?: number
  gap?: number
  avoidCollisions?: boolean
  collisionPadding?: number
  open?: boolean
  label?: ReactNode
  unit?: ReactNode
  decimals?: number
  format?: (value: number) => string
  separator?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode | ((value: number, from?: number) => ReactNode)
}

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type Axis = "x" | "y"

const extent = { x: "width", y: "height" } as const

const corner = (p: Point, d: Point, size: Size, gap: number): Point => {
  const len = Math.hypot(d.x, d.y) || 1
  return {
    x: p.x + (d.x / len) * gap + ((d.x - 1) / 2) * size.width,
    y: p.y + (d.y / len) * gap + ((d.y - 1) / 2) * size.height,
  }
}

const sides: Record<Exclude<GaugeTooltipSide, "auto">, Point> = {
  center: { x: 0, y: 0 },
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

const boxPoints: Record<string, Point> = {
  top: { x: 0.5, y: 0 },
  right: { x: 1, y: 0.5 },
  bottom: { x: 0.5, y: 1 },
  left: { x: 0, y: 0.5 },
  "top-left": { x: 0, y: 0 },
  "top-right": { x: 1, y: 0 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-right": { x: 1, y: 1 },
}

const FOCUSABLE =
  '[tabindex]:not([tabindex="-1"]), a[href], button, input, select, textarea, [data-slot="gauge-control"]'

const subscribe = () => () => {}
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )

export const GaugeTooltip = ({
  position = "value",
  side = "auto",
  at,
  offset = 24,
  gap = 8,
  avoidCollisions = true,
  collisionPadding = 8,
  open,
  label,
  unit,
  decimals = 0,
  format,
  separator = "–",
  className,
  style,
  children,
}: GaugeTooltipProps) => {
  const gauge = useGauge()
  const isClient = useIsClient()
  const anchor = useRef<SVGGElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const pointer = useRef<Point | null>(null)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focused, setFocused] = useState(false)
  const shown = open ?? (hovered || pressed || focused)

  const value = at ?? gauge.value
  const spread = at === undefined && gauge.range
  const middle = !spread
    ? value
    : gauge.wrap
      ? foldValue(
          gauge.from +
            foldValue(gauge.value - gauge.from, 0, gauge.max - gauge.min) / 2,
          gauge.min,
          gauge.max
        )
      : (gauge.from + gauge.value) / 2
  const along = gauge.positionOf(middle)

  const pinned = (): Point | null => {
    if (position === "pointer") return pointer.current
    const ctm = anchor.current?.getScreenCTM()
    if (!ctm) return null
    let p: Point = { x: 0, y: 0 }
    if (position === "value") p = gauge.scale.point(along, offset)
    else if (position !== "center") {
      const b = gauge.scale.box(offset)
      const spot = boxPoints[position]
      p = { x: b.x + b.width * spot.x, y: b.y + b.height * spot.y }
    }
    return new DOMPoint(p.x, p.y).matrixTransform(ctm)
  }

  const direction = (): Point => {
    if (side !== "auto") return sides[side]
    if (position === "pointer") return sides.top
    if (position === "center") return sides.center
    if (position !== "value") {
      const spot = boxPoints[position]
      return { x: spot.x * 2 - 1, y: spot.y * 2 - 1 }
    }
    const r = gauge.scale.normal(along)
    const m = Math.max(Math.abs(r.x), Math.abs(r.y)) || 1
    return { x: r.x / m, y: r.y / m }
  }

  const place = useEffectEvent(() => {
    const el = box.current
    if (!el) return
    const p = pinned()
    if (!p) {
      el.style.visibility = "hidden"
      return
    }
    const size = { width: el.offsetWidth, height: el.offsetHeight }
    let d = direction()
    let at = corner(p, d, size, gap)

    if (avoidCollisions) {
      const view = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      }
      const pad = collisionPadding
      const spill = (at: Point, axis: Axis) => {
        const span = size[extent[axis]]
        const room = view[extent[axis]] - pad
        const out =
          Math.max(0, pad - at[axis]) + Math.max(0, at[axis] + span - room)
        return Math.min(span, out)
      }
      for (const axis of ["x", "y"] as const) {
        const before = spill(at, axis)
        if (before === 0 || d[axis] === 0) continue
        const flipped = { ...d, [axis]: -d[axis] }
        const there = corner(p, flipped, size, gap)
        if (spill(there, axis) < before) {
          d = flipped
          at = there
        }
      }
      const { width } = size
      if (p.x >= at.x && p.x <= at.x + width) {
        const inside = Math.max(pad, Math.min(at.x, view.width - pad - width))
        at = { ...at, x: Math.max(p.x - width, Math.min(inside, p.x)) }
      }
    }

    el.style.visibility = ""
    el.style.left = `${at.x + window.scrollX}px`
    el.style.top = `${at.y + window.scrollY}px`
  })

  useEffect(() => {
    const svg = anchor.current?.ownerSVGElement
    if (!svg) return
    const track = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
    }
    const enter = (e: PointerEvent) => {
      track(e)
      setHovered(true)
    }
    const move = (e: PointerEvent) => {
      track(e)
      place()
    }
    const leave = () => setHovered(false)
    const down = (e: PointerEvent) => {
      track(e)
      setPressed(true)
    }
    svg.addEventListener("pointerenter", enter)
    svg.addEventListener("pointermove", move)
    svg.addEventListener("pointerleave", leave)
    svg.addEventListener("pointerdown", down)
    return () => {
      svg.removeEventListener("pointerenter", enter)
      svg.removeEventListener("pointermove", move)
      svg.removeEventListener("pointerleave", leave)
      svg.removeEventListener("pointerdown", down)
    }
  }, [])

  useEffect(() => {
    const owner = anchor.current?.ownerSVGElement?.closest(FOCUSABLE)
    if (!owner) return
    const within = () => owner.contains(document.activeElement)
    const check = () =>
      setFocused(
        within() &&
          Boolean(
            document.activeElement?.matches(
              ":focus-visible:not([data-pointer])"
            )
          )
      )
    const key = () => setFocused(within())
    const blur = (e: Event) => {
      const next = (e as FocusEvent).relatedTarget as Node | null
      if (!owner.contains(next)) setFocused(false)
    }
    check()
    owner.addEventListener("focusin", check)
    owner.addEventListener("keydown", key)
    owner.addEventListener("focusout", blur)
    return () => {
      owner.removeEventListener("focusin", check)
      owner.removeEventListener("keydown", key)
      owner.removeEventListener("focusout", blur)
    }
  }, [])

  useEffect(() => {
    if (!pressed) return
    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      place()
    }
    const release = () => setPressed(false)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", release)
    window.addEventListener("pointercancel", release)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
    }
  }, [pressed])

  useEffect(() => {
    if (!shown) return
    const update = () => place()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [shown])

  useLayoutEffect(() => {
    if (shown) place()
  })

  const text = (v: number) => (format ? format(v) : v.toFixed(decimals))
  const content =
    typeof children === "function"
      ? spread
        ? children(value, gauge.from)
        : children(value)
      : (children ?? (
          <DefaultContent
            text={
              spread
                ? `${text(gauge.from)}${separator}${text(value)}`
                : text(value)
            }
            label={label}
            unit={unit}
          />
        ))

  return (
    <>
      <g ref={anchor} />
      {shown &&
        isClient &&
        createPortal(
          <div
            ref={box}
            className="pointer-events-none absolute top-0 left-0 z-50"
          >
            <div
              role="tooltip"
              data-slot="gauge-tooltip"
              style={style}
              className={cn(
                "w-max max-w-xs animate-in rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-md fade-in-0 zoom-in-95",
                className
              )}
            >
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

const DefaultContent = ({
  text,
  label,
  unit,
}: {
  text: string
  label?: ReactNode
  unit?: ReactNode
}) => (
  <div className="flex flex-col items-center leading-tight">
    {label && <span className="opacity-70">{label}</span>}
    <span className="text-sm font-semibold tabular-nums">
      {text}
      {unit && (
        <span className="ml-0.5 text-xs font-medium opacity-70">{unit}</span>
      )}
    </span>
  </div>
)
