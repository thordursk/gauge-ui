"use client"

import { useState, type ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { formatLabel, isHexColor, type SelectOption } from "@/lib/controls"

/**
 * One control row, shaped like the dial slider: a single container the full
 * width of the panel, the label inside it on the left and the control on the
 * right.
 */
export const Row = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex h-8 items-center justify-between gap-2 rounded-md bg-input/50 px-2.5">
    <span className="truncate text-[13px] font-medium text-foreground/80">
      {label}
    </span>
    {children}
  </div>
)

export const ToggleControl = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <Row label={label}>
    <Switch
      size="sm"
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
    />
  </Row>
)

const Swatch = ({ css }: { css: string }) => (
  <span
    aria-hidden
    /* An inset ring, so a swatch the colour of the panel behind it still
       reads as a dot. */
    className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/20 ring-inset"
    style={{ background: css }}
  />
)

type NormalOption = { value: string; label: string; swatch?: string }

const normalizeOption = (option: SelectOption): NormalOption =>
  typeof option === "string"
    ? { value: option, label: formatLabel(option) }
    : option

export const SelectControl = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}) => {
  const items = options.map(normalizeOption)
  const selected = items.find((item) => item.value === value)
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next)
      }}
    >
      {/* The whole row is the trigger, label and all, like the slider. */}
      <SelectTrigger
        size="sm"
        aria-label={label}
        className="w-full min-w-0 gap-2 rounded-md border-transparent bg-input/50 px-2.5 text-[13px] font-medium transition-colors hover:bg-input/70 active:bg-input/90 data-[size=sm]:h-8 data-popup-open:bg-input/90"
      >
        <span className="min-w-0 flex-1 truncate text-left font-medium text-foreground/80">
          {label}
        </span>
        <SelectValue className="flex-none">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            {selected?.swatch && <Swatch css={selected.swatch} />}
            <span className="truncate">{selected?.label ?? value}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      {/* The trigger is the whole row, so the popup sizes to its options
          rather than inheriting the anchor's width. */}
      <SelectContent align="end" className="w-auto min-w-28 p-1">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="py-1.5 text-[13px]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {item.swatch && <Swatch css={item.swatch} />}
              <span className="truncate">{item.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const TextControl = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) => (
  <Row label={label}>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-full min-w-0 flex-1 bg-transparent text-right text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:text-foreground"
    />
  </Row>
)

/** The exact `#rrggbb` a native colour input insists on. */
const toHex6 = (value: string) => {
  if (!isHexColor(value)) return "#000000"
  if (value.length === 4)
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  return value.slice(0, 7)
}

/**
 * A free colour: the swatch opens the browser's picker, the field takes a
 * typed hex. The field keeps its own text while it is an incomplete colour,
 * committing each keystroke that parses.
 */
export const ColorControl = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Row label={label}>
      <div className="flex items-center gap-1.5">
        <label
          className="relative size-4 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-foreground/20 ring-inset"
          style={{ background: isHexColor(value) ? value : undefined }}
        >
          <input
            type="color"
            value={toHex6(value)}
            onChange={(e) => {
              setDraft(null)
              onChange(e.target.value)
            }}
            aria-label={`${label} picker`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={draft ?? value}
          spellCheck={false}
          aria-label={label}
          onChange={(e) => {
            const text = e.target.value
            setDraft(text)
            if (isHexColor(text)) onChange(text)
          }}
          onBlur={() => setDraft(null)}
          className="w-[7.5ch] bg-transparent text-right font-mono text-xs text-muted-foreground outline-none focus:text-foreground"
        />
      </div>
    </Row>
  )
}
