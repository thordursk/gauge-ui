"use client"

import { useMemo, useState } from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GaugePreview } from "@/components/gauge-preview"
import { SegmentedControl } from "@/components/segmented-control"
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
  templateCategories,
  templatePreview,
  type GaugeTemplate,
  type TemplateCategory,
} from "@/lib/gauge-templates"
import { cn } from "@/lib/utils"

type TemplatePickerProps = {
  selected: GaugeTemplate | null
  onSelect: (template: GaugeTemplate) => void
  className?: string
}

type Filter = TemplateCategory | "all"

const filters = [
  { value: "all", label: "All" },
  ...templateCategories.map(({ id, name }) => ({ value: id, label: name })),
] as const satisfies readonly { value: Filter; label: string }[]

export const TemplatePicker = ({
  selected,
  onSelect,
  className,
}: TemplatePickerProps) => {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const shelves = templateCategories
    .filter(({ id }) => filter === "all" || id === filter)
    .map((category) => ({
      ...category,
      templates: gaugeTemplates.filter((t) => t.category === category.id),
    }))

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
        initialFocus={(openType) => openType === "keyboard"}
        className="h-[min(40rem,var(--available-height))] w-[min(40rem,calc(100vw-1.5rem))] gap-4 overflow-y-auto overscroll-contain bg-card px-3 pt-0 pb-3 sm:px-4 sm:pb-4"
      >
        <PopoverHeader className="sticky top-0 z-10 -mx-3 gap-2 border-b border-foreground/10 bg-card px-3 pt-3 pb-2 sm:-mx-4 sm:px-4 sm:pt-4">
          <PopoverTitle className="text-sm">Start from a template</PopoverTitle>
          <div className="-mx-1 overflow-x-auto">
            <SegmentedControl
              options={filters}
              value={filter}
              onValueChange={setFilter}
              aria-label="Template category"
              itemClassName="shrink-0"
            />
          </div>
        </PopoverHeader>
        {shelves.map((shelf) => (
          <section
            key={shelf.id}
            aria-labelledby={`template-shelf-${shelf.id}`}
            className="flex flex-col gap-2"
          >
            {filter === "all" && (
              <h3
                id={`template-shelf-${shelf.id}`}
                className="flex items-baseline gap-1.5 px-1 text-xs font-medium text-muted-foreground"
              >
                {shelf.name}
                <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                  {shelf.templates.length}
                </span>
              </h3>
            )}
            <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-3 sm:grid-cols-5">
              {shelf.templates.map((template) => (
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
          </section>
        ))}
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
      ref={
        selected
          ? (el) => {
              const frame = requestAnimationFrame(() =>
                el?.scrollIntoView({ block: "nearest" })
              )
              return () => cancelAnimationFrame(frame)
            }
          : undefined
      }
      className={cn(
        "group flex flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        selected &&
          "border-foreground/40 bg-accent ring ring-foreground/10 hover:bg-accent"
      )}
    >
      <div className="flex aspect-square min-h-0 w-full items-center justify-center rounded-xl border border-foreground/10 bg-background p-3">
        <GaugePreview spec={spec} value={value} tooltips={false} />
      </div>
      <div className="px-1 pb-0.5 text-center text-xs font-medium">
        {template.name}
      </div>
    </button>
  )
}
