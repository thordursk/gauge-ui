import Link from "next/link"
import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

type Point = { x: number; y: number }

const HUB: Point = { x: 12, y: 13 }
const RADIUS = 8
const START_DEG = 135
const END_DEG = 45
const SWEEP_DEG = (END_DEG - START_DEG + 360) % 360
const FILL_DEG = 165
const HOVER_SWING_DEG = 45
const NEEDLE_LENGTH = 5.5
const HUB_RADIUS = 1.75

const round = (n: number) => Number(n.toFixed(2))

export const polar = (center: Point, radius: number, deg: number): Point => {
  const rad = (deg * Math.PI) / 180
  return {
    x: round(center.x + radius * Math.cos(rad)),
    y: round(center.y + radius * Math.sin(rad)),
  }
}

export const arcPath = (
  center: Point,
  radius: number,
  startDeg: number,
  endDeg: number
) => {
  const from = polar(center, radius, startDeg)
  const to = polar(center, radius, endDeg)
  const largeArc = (endDeg - startDeg + 360) % 360 > 180 ? 1 : 0
  return `M${from.x} ${from.y} A${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`
}

const arc = arcPath(HUB, RADIUS, START_DEG, END_DEG)
const tip = polar(HUB, NEEDLE_LENGTH, START_DEG + FILL_DEG)
const needle = `M${HUB.x} ${HUB.y} L${tip.x} ${tip.y}`

const swing = "duration-500 ease-overshoot motion-reduce:transition-none"

const swingVars = {
  "--swing": `${HOVER_SWING_DEG}deg`,
  "--swung-offset": SWEEP_DEG - FILL_DEG - HOVER_SWING_DEG,
} as CSSProperties

const Mark = ({
  className,
  animated = false,
}: {
  className?: string
  animated?: boolean
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    aria-hidden
    className={cn("size-5 shrink-0", className)}
    style={animated ? swingVars : undefined}
  >
    <path d={arc} strokeWidth={2.5} opacity={0.3} />
    <path
      d={arc}
      pathLength={SWEEP_DEG}
      strokeWidth={2.5}
      strokeDasharray={SWEEP_DEG}
      strokeDashoffset={SWEEP_DEG - FILL_DEG}
      className={
        animated
          ? cn(
              "transition-[stroke-dashoffset] group-hover/logo:[stroke-dashoffset:var(--swung-offset)] group-focus-visible/logo:[stroke-dashoffset:var(--swung-offset)]",
              swing
            )
          : undefined
      }
    />
    <path
      d={needle}
      strokeWidth={2}
      style={
        animated
          ? {
              transformOrigin: `${HUB.x}px ${HUB.y}px`,
              transformBox: "view-box",
            }
          : undefined
      }
      className={
        animated
          ? cn(
              "transition-transform group-hover/logo:rotate-(--swing) group-focus-visible/logo:rotate-(--swing)",
              swing
            )
          : undefined
      }
    />
    <circle
      cx={HUB.x}
      cy={HUB.y}
      r={HUB_RADIUS}
      fill="currentColor"
      stroke="none"
    />
  </svg>
)

export const Logo = ({ className }: { className?: string }) => (
  <Mark className={className} />
)

export const LogoLink = ({ className }: { className?: string }) => (
  <Link
    href="/"
    className={cn(
      "group/logo flex items-center gap-2 text-base font-semibold tracking-tight",
      className
    )}
  >
    <Mark animated />
    Gauge UI
  </Link>
)
