"use client"

import { useMemo } from "react"

import { AnimatedGauge } from "@/components/animated-gauge"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

const HERO_TEMPLATE = "speed-fuel"

/** A studio template left wandering, so the hero shows the gauge in motion. */
export const HeroGauge = () => {
  const { spec, value } = useMemo(() => {
    const template =
      gaugeTemplates.find((t) => t.id === HERO_TEMPLATE) ?? gaugeTemplates[0]
    return templatePreview(template)
  }, [])

  return (
    <AnimatedGauge
      spec={spec}
      value={value}
      mode="wander"
      period={1.8}
      amplitude={0.3}
      sweepIn
    />
  )
}
