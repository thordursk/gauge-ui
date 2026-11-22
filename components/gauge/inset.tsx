"use client"

import type { SVGProps } from "react"

import {
  GaugeContext,
  useGaugeContextValue,
  useLinearGaugeContextValue,
} from "./context"
import type { GaugeDomainProps, LinearGaugeDomainProps } from "./context"

export type GaugeInsetProps = Omit<SVGProps<SVGGElement>, "transform"> &
  GaugeDomainProps & {
    x?: number
    y?: number
    scale?: number
  }

export const GaugeInset = ({
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
  x = 0,
  y = 0,
  scale = 1,
  children,
  ...props
}: GaugeInsetProps) => {
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

  return (
    <GaugeContext.Provider value={gauge}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} {...props}>
        {children}
      </g>
    </GaugeContext.Provider>
  )
}

export type LinearGaugeInsetProps = Omit<SVGProps<SVGGElement>, "transform"> &
  LinearGaugeDomainProps & {
    x?: number
    y?: number
    scale?: number
  }

export const LinearGaugeInset = ({
  value,
  min,
  max,
  transition,
  initialValue,
  wrap,
  orientation,
  length,
  x = 0,
  y = 0,
  scale = 1,
  children,
  ...props
}: LinearGaugeInsetProps) => {
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

  return (
    <GaugeContext.Provider value={gauge}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} {...props}>
        {children}
      </g>
    </GaugeContext.Provider>
  )
}
