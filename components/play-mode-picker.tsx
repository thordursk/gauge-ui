"use client"

import { useState } from "react"
import {
  ArrowDown01Icon,
  FilterHorizontalIcon,
  RepeatIcon,
  ShuffleIcon,
  WavesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { playModes, type PlayMode } from "@/lib/gauge-panels"
import { cn } from "@/lib/utils"

type PlayModePickerProps = {
  mode: PlayMode
  onModeChange: (mode: PlayMode) => void
  className?: string
}

/** How each mode reads in the list, in the order the picker shows them. */
const modes: Record<PlayMode, { label: string; icon: typeof RepeatIcon }> = {
  manual: { label: "Manual", icon: FilterHorizontalIcon },
  sweep: { label: "Sweep", icon: RepeatIcon },
  wander: { label: "Wander", icon: WavesIcon },
  jump: { label: "Jump", icon: ShuffleIcon },
}

/**
 * How the gauge's value moves, as a dropdown alongside the layer picker,
 * which is what keeps the bar's top row to one line however narrow it gets.
 */
export const PlayModePicker = ({
  mode,
  onModeChange,
  className,
}: PlayModePickerProps) => {
  const [open, setOpen] = useState(false)
  const current = modes[mode]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className={cn("min-w-0", className)}
            aria-label={`Play mode: ${current.label}`}
          >
            <HugeiconsIcon
              icon={current.icon}
              strokeWidth={2}
              className="size-3.5"
              data-icon="inline-start"
            />
            <span className="truncate">{current.label}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent
        align="end"
        side="top"
        /* Pointer opens leave focus on the trigger so the first row does not
           light up with a focus ring; keyboard opens keep the default hop
           into the list. */
        initialFocus={(openType) => openType === "keyboard"}
        className="w-[min(12rem,calc(100vw-1.5rem))] gap-2 bg-card p-2"
      >
        <PopoverHeader className="px-1 pt-1">
          <PopoverTitle className="text-xs font-medium text-muted-foreground">
            Play mode
          </PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-0.5">
          {playModes.map((value) => {
            const { label, icon } = modes[value]
            const selected = value === mode
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onModeChange(value)
                  setOpen(false)
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  selected
                    ? "bg-accent ring ring-foreground/10"
                    : "hover:bg-muted"
                )}
              >
                <HugeiconsIcon
                  icon={icon}
                  strokeWidth={2}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate text-sm font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
