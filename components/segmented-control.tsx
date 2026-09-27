"use client"

import * as React from "react"
import { motion } from "motion/react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type SegmentedOption<T extends string> = {
  value: T
  label: React.ReactNode
}

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  "aria-label"?: string
  className?: string
  itemClassName?: string
}

/* The pill slides rather than jumps between options. */
const pillTransition = {
  duration: 0.2,
  ease: [0.25, 1, 0.5, 1] as const,
}

/**
 * A single-select ToggleGroup styled as a segmented control: a
 * transparent strip with a pill that slides behind the active option.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
  itemClassName,
}: SegmentedControlProps<T>) {
  const pillId = React.useId()
  const values = React.useMemo(
    () => new Set<string>(options.map((o) => o.value)),
    [options]
  )

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        const [selected] = next
        /* Base UI empties the array when the active item is clicked again;
           a segmented control always keeps one option selected. */
        if (typeof selected === "string" && values.has(selected)) {
          onValueChange(selected as T)
        }
      }}
      spacing={0}
      aria-label={ariaLabel}
      className={cn("rounded-[8px] p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "relative h-auto min-w-0 rounded-full bg-transparent px-2 py-1.5 text-[13px] font-medium transition-colors duration-150",
              "hover:bg-transparent aria-pressed:bg-transparent data-pressed:bg-transparent data-[state=on]:bg-transparent",
              active
                ? "text-foreground hover:text-foreground"
                : "text-foreground/60 hover:text-foreground/80",
              itemClassName
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={pillTransition}
                aria-hidden
                className="absolute inset-0 rounded-full bg-foreground/10"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
