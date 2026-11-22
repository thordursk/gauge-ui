"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  fontClass,
  weightClass,
  type FontFamily,
  type FontWeight,
  type GaugeEnd,
  type TextAnchor,
} from "./utils"

import { useGauge } from "./context"

export type GaugeTextProps = {
  x?: number
  y?: number
  fontSize?: number
  color?: string
  font?: FontFamily
  weight?: FontWeight
  anchor?: TextAnchor
  className?: string
  children: ReactNode
}

export const GaugeText = ({
  x = 0,
  y = 0,
  fontSize = 24,
  color = "currentColor",
  font = "sans",
  weight = "medium",
  anchor = "middle",
  className,
  children,
}: GaugeTextProps) => (
  <text
    x={x}
    y={y}
    fill={color}
    fontSize={fontSize}
    textAnchor={anchor}
    dominantBaseline="central"
    className={cn(fontClass[font], weightClass[weight], className)}
  >
    {children}
  </text>
)

export type GaugeValueProps = Omit<GaugeTextProps, "children"> & {
  decimals?: number
  format?: (value: number) => string
  separator?: string
  end?: GaugeEnd
}

export const GaugeValue = ({
  decimals = 0,
  format,
  separator = "–",
  end,
  className,
  fontSize = 96,
  weight = "semibold",
  ...props
}: GaugeValueProps) => {
  const { value, from, range } = useGauge()
  const text = (v: number) => (format ? format(v) : v.toFixed(decimals))
  return (
    <GaugeText
      fontSize={fontSize}
      weight={weight}
      className={cn("tabular-nums", className)}
      {...props}
    >
      {end === "from"
        ? text(from)
        : range && !end
          ? `${text(from)}${separator}${text(value)}`
          : text(value)}
    </GaugeText>
  )
}
