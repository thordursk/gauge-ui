"use client"

import { useEffect } from "react"

import { TemplatePicker } from "@/components/template-picker"
import { gaugeTemplates, type GaugeTemplate } from "@/lib/gauge-templates"
import { isPlainKey, isTypingTarget } from "@/lib/hotkeys"
import { cn } from "@/lib/utils"

type TemplateNavProps = {
  selected: GaugeTemplate | null
  onSelect: (template: GaugeTemplate) => void
  className?: string
}

/** The template the given number of steps away, wrapping at both ends. */
const templateFrom = (selected: GaugeTemplate | null, step: 1 | -1) => {
  const n = gaugeTemplates.length
  const index = selected
    ? gaugeTemplates.findIndex((t) => t.id === selected.id)
    : -1
  if (index === -1) return gaugeTemplates[step === 1 ? 0 : n - 1]
  return gaugeTemplates[(index + step + n) % n]
}

/**
 * The template picker, with the same moves on the keyboard: `[` and `]`
 * anywhere outside a text field, and the arrow keys when nothing else has
 * focus, so they never fight a slider.
 */
export const TemplateNav = ({
  selected,
  onSelect,
  className,
}: TemplateNavProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlainKey(event) || isTypingTarget(event.target)) return

      const bracket = { "[": -1, "]": 1 } as const
      const arrow = { ArrowLeft: -1, ArrowRight: 1 } as const

      let step: 1 | -1 | undefined
      if (event.key in bracket)
        step = bracket[event.key as keyof typeof bracket]
      else if (event.key in arrow) {
        const target = event.target as HTMLElement | null
        const idle =
          target === document.body ||
          target?.closest("[data-template-nav]") !== null
        if (idle) step = arrow[event.key as keyof typeof arrow]
      }
      if (!step) return

      event.preventDefault()
      onSelect(templateFrom(selected, step))
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selected, onSelect])

  return (
    <div className={cn(className)} data-template-nav>
      <TemplatePicker
        selected={selected}
        onSelect={onSelect}
        className="min-w-0"
      />
    </div>
  )
}
