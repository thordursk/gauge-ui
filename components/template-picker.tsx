"use client"

import { useMemo, useState } from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
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
import {
  gaugeTemplates,
  templatePreview,
  type GaugeTemplate,
} from "@/lib/gauge-templates"
import { cn } from "@/lib/utils"

type TemplatePickerProps = {
  /** The template currently in use, shown on the button and highlighted. */
  selected: GaugeTemplate | null
  onSelect: (template: GaugeTemplate) => void
  className?: string
}

/** Header button that opens a grid of starting points, each with a live preview. */
export const TemplatePicker = ({
  selected,
  onSelect,
  className,
}: TemplatePickerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="secondary" className={className}>
            <span className="truncate">
              {selected ? selected.name : "Templates"}
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent
        align="end"
        /* Pointer opens leave focus on the trigger so the first card does not
           light up with a focus ring; keyboard opens keep the default hop into
           the grid. */
        initialFocus={(openType) => openType === "keyboard"}
        className="max-h-[var(--available-height)] w-[min(40rem,calc(100vw-1.5rem))] gap-3 overflow-y-auto overscroll-contain bg-card p-3 sm:p-4"
      >
        <PopoverHeader>
          <PopoverTitle className="text-sm">Start from a template</PopoverTitle>
        </PopoverHeader>
        <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-3 sm:grid-cols-5">
          {gaugeTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selected={template.id === selected?.id}
              onSelect={() => {
                onSelect(template)
                setOpen(false)
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type TemplateCardProps = {
  template: GaugeTemplate
  selected: boolean
  onSelect: () => void
}

const TemplateCard = ({ template, selected, onSelect }: TemplateCardProps) => {
  const { spec, value } = useMemo(() => templatePreview(template), [template])

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        selected &&
          "border-foreground/40 bg-accent ring ring-foreground/10 hover:bg-accent"
      )}
    >
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-foreground/10 bg-background p-3">
        <GaugePreview spec={spec} value={value} />
      </div>
      <div className="px-1 pb-0.5 text-center text-xs font-medium">
        {template.name}
      </div>
    </button>
  )
}
