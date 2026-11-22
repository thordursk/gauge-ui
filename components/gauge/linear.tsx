"use client"

import type { SVGProps } from "react"

import { cn } from "@/lib/utils"

import { GaugeContext, useLinearGaugeContextValue } from "./context"
import type { LinearGaugeDomainProps } from "./context"

export type LinearGaugePadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

export type LinearGaugeProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> &
  LinearGaugeDomainProps & {
    padding?: LinearGaugePadding
  }

export const LinearGauge = ({
  value,
  min,
  max,
  transition,
  initialValue,
  wrap,
  orientation,
  length,
  padding = 32,
  className,
  style,
  children,
  ...props
}: LinearGaugeProps) => {
  const gauge = useLinearGaugeContextValue({
    value,
    min,
    max,
    transition,
    initialValue,
    wrap,
    orientation,
    length,
  })

  const pad =
    typeof padding === "number"
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : { top: 0, right: 0, bottom: 0, left: 0, ...padding }
  const half = gauge.length / 2
  const vertical = gauge.orientation === "vertical"
  const box = vertical
    ? {
        x: -pad.left,
        y: -half - pad.top,
        width: pad.left + pad.right,
        height: gauge.length + pad.top + pad.bottom,
      }
    : {
        x: -half - pad.left,
        y: -pad.top,
        width: gauge.length + pad.left + pad.right,
        height: pad.top + pad.bottom,
      }

  return (
    <GaugeContext.Provider value={gauge}>
      <svg
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ aspectRatio: `${box.width} / ${box.height}`, ...style }}
        className={cn(
          "overflow-visible",
          vertical ? "h-full w-auto" : "h-auto w-full",
          className
        )}
        {...props}
      >
        {children}
      </svg>
    </GaugeContext.Provider>
  )
}
