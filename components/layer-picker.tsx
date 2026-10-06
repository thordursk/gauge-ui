"use client"

import { useMemo, useState } from "react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Delete02Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GaugePreview } from "@/components/gauge-preview"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { buildSpec } from "@/lib/gauge-panels"
import type { GaugeLayer } from "@/lib/gauge-layers"
import { cn } from "@/lib/utils"

type LayerPickerProps = {
  layers: GaugeLayer[]
  /** Index of the gauge the panels and the value slider are pointed at. */
  selected: number
  onSelect: (index: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
  className?: string
}

/**
 * The composition as a stack, the way a layers panel shows one: the insets on
 * top of the gauge they sit in, each a live thumbnail of itself, the selected
 * one being the gauge the panels edit. Insets are added and taken away here,
 * and the first layer — the gauge the rest sit inside — stays.
 *
 * It stays open while layers are picked, so a composition can be worked
 * through without reaching for the trigger between each one.
 */
export const LayerPicker = ({
  layers,
  selected,
  onSelect,
  onAdd,
  onRemove,
  className,
}: LayerPickerProps) => {
  const [open, setOpen] = useState(false)
  const current = layers[selected] ?? layers[0]
  /* Topmost first, as a layer stack reads, while each row keeps the index it
     has in the composition. */
  const stack = layers.map((layer, index) => ({ layer, index })).reverse()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className={cn("min-w-0", className)}
            aria-label={`Gauges: ${current.name} selected`}
          >
            <HugeiconsIcon
              icon={Layers01Icon}
              strokeWidth={2}
              className="size-3.5"
              data-icon="inline-start"
            />
            <span className="truncate">{current.name}</span>
            {layers.length > 1 && (
              <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">
                {layers.length}
              </span>
            )}
            <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        side="top"
        /* Pointer opens leave focus on the trigger so the first row does not
           light up with a focus ring; keyboard opens keep the default hop
           into the list. */
        initialFocus={(openType) => openType === "keyboard"}
        className="max-h-[min(24rem,var(--available-height))] w-[min(17rem,calc(100vw-1.5rem))] gap-2 overflow-y-auto overscroll-contain bg-card p-2"
      >
        <PopoverHeader className="px-1 pt-1">
          <PopoverTitle className="text-xs font-medium text-muted-foreground">
            Gauges
          </PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-0.5">
          {stack.map(({ layer, index }) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              selected={index === selected}
              /* The gauge the insets sit in is the composition itself. */
              removable={index !== 0}
              onSelect={() => onSelect(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
        <div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="w-full justify-start"
          >
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            <span>Add a gauge</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type LayerRowProps = {
  layer: GaugeLayer
  selected: boolean
  removable: boolean
  onSelect: () => void
  onRemove: () => void
}

const LayerRow = ({
  layer,
  selected,
  removable,
  onSelect,
  onRemove,
}: LayerRowProps) => {
  /* The layer on its own, without whatever it is nested with, so the
     thumbnail is of this gauge and nothing else. */
  const spec = useMemo(() => buildSpec(layer.values), [layer.values])

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl p-1 transition-colors",
        selected ? "bg-accent ring ring-foreground/10" : "hover:bg-muted"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-background p-1">
          <GaugePreview
            spec={spec}
            value={layer.values.value.value}
            transition={false}
            tooltips={false}
          />
        </span>
        <span className="truncate text-sm font-medium">{layer.name}</span>
      </button>
      {removable ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove ${layer.name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </Button>
      ) : (
        <span className="shrink-0 pr-1.5 text-[11px] text-muted-foreground">
          Base
        </span>
      )}
    </div>
  )
}
