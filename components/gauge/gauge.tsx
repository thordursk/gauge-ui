"use client"

import type { SVGProps } from "react"

import { cn } from "@/lib/utils"
import { arcBox } from "./math"

import { GaugeContext, useGaugeContextValue } from "./context"
import type { GaugeDomainProps } from "./context"

export type GaugeFit = "square" | "content"

export type GaugeProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> &
  GaugeDomainProps & {
    padding?: number
    fit?: GaugeFit
  }

export const Gauge = ({
  value,
  min,
  max,
  startAngle,
  endAngle,
  radius,
  transition,
  initialValue,
  wrap,
  rotate,
  padding = 48,
  fit = "square",
  className,
  style,
  children,
  ...props
}: GaugeProps) => {
  const gauge = useGaugeContextValue({
    value,
    min,
    max,
    startAngle,
    endAngle,
    radius,
    transition,
    initialValue,
    wrap,
    rotate,
  })

  const half = gauge.radius + padding
  const box =
    fit === "content"
      ? arcBox(gauge.radius, gauge.startAngle, gauge.endAngle, padding)
      : { x: -half, y: -half, width: 2 * half, height: 2 * half }

  return (
    <GaugeContext.Provider value={gauge}>
      <svg
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={
          fit === "content"
            ? { aspectRatio: `${box.width} / ${box.height}`, ...style }
            : style
        }
        className={cn(
          "overflow-visible",
          fit === "content" ? "max-h-full w-full" : "h-full w-full",
          className
        )}
        {...props}
      >
        {children}
      </svg>
    </GaugeContext.Provider>
  )
}
