"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  ColorControl,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@/components/controls/field-controls"
import { PadControl } from "@/components/controls/pad-control"
import { SliderControl } from "@/components/controls/slider-control"
import { TransitionControl } from "@/components/controls/transition-control"
import {
  ControlsStore,
  isPadValue,
  isTransitionConfig,
  type ControlMeta,
  type ControlValue,
  type FlatValues,
  type PanelConfig,
} from "@/lib/controls"
import { cn } from "@/lib/utils"

/**
 * Every panel registered through `useControlPanel`, in registration order,
 * each a collapsible section. This is the whole of the sidebar's content:
 * the store carries the values, so the tree re-renders panel by panel as
 * they change rather than as a whole.
 */
export const ControlsRoot = () => {
  const panels = useSyncExternalStore(
    ControlsStore.subscribeGlobal,
    ControlsStore.getPanels,
    ControlsStore.getPanels
  )
  return (
    <div className="flex flex-col">
      {panels.map((panel) => (
        <PanelSection key={panel.id} panel={panel} />
      ))}
    </div>
  )
}

const Chevron = ({ open }: { open: boolean }) => (
  <HugeiconsIcon
    icon={ArrowRight01Icon}
    strokeWidth={2}
    className={cn(
      "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
      open && "rotate-90"
    )}
  />
)

const PanelSection = ({ panel }: { panel: PanelConfig }) => {
  const subscribe = useCallback(
    (listener: () => void) => ControlsStore.subscribe(panel.id, listener),
    [panel.id]
  )
  const getValues = useCallback(
    () => ControlsStore.getValues(panel.id),
    [panel.id]
  )
  const values = useSyncExternalStore(subscribe, getValues, getValues)
  const [open, setOpen] = useState(!panel.defaultCollapsed)

  return (
    <section className="border-b border-foreground/5 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-1.5 px-2.5 text-[13px] font-semibold text-foreground/90 transition-colors hover:text-foreground"
      >
        <Chevron open={open} />
        {panel.name}
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-3 pb-2.5">
          <ControlList
            panelId={panel.id}
            controls={panel.controls}
            values={values}
          />
        </div>
      )}
    </section>
  )
}

/**
 * A nested group. Open state lives here and the component is keyed on its
 * path, so a folder holds its fold across the config rebuilds that add and
 * remove controls inside it.
 */
const Folder = ({
  label,
  defaultOpen,
  children,
}: {
  label: string
  defaultOpen: boolean
  children: React.ReactNode
}) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center gap-1.5 rounded-md text-[13px] font-medium text-foreground/80 transition-colors hover:text-foreground"
      >
        <Chevron open={open} />
        {label}
      </button>
      {open && (
        <div className="mt-0.5 mb-1 ml-1.5 flex flex-col gap-1 border-l border-foreground/10 pl-2">
          {children}
        </div>
      )}
    </div>
  )
}

const ControlList = ({
  panelId,
  controls,
  values,
}: {
  panelId: string
  controls: ControlMeta[]
  values: FlatValues
}) => (
  <>
    {controls.map((control) => (
      <ControlRow
        key={control.path}
        panelId={panelId}
        control={control}
        values={values}
      />
    ))}
  </>
)

/**
 * The colour controls are folders in the config — a `token` select plus, only
 * while "custom" is picked, a `custom` hex — but folders sit inside groups
 * that sit inside panels, and three levels of accordion is one too many. A
 * folder of that shape is recognised here and rendered flat: one select row
 * under the folder's own label, with the hex row beneath it when it exists.
 */
const colorFolderOf = (control: ControlMeta) => {
  const children = control.children ?? []
  const token = children.find(
    (child) => child.type === "select" && child.path.endsWith(".token")
  )
  if (!token) return null
  const rest = children.filter((child) => child !== token)
  const custom =
    rest.length === 1 && rest[0].type === "color" ? rest[0] : undefined
  if (rest.length !== (custom ? 1 : 0)) return null
  return { token, custom }
}

const ControlRow = ({
  panelId,
  control,
  values,
}: {
  panelId: string
  control: ControlMeta
  values: FlatValues
}) => {
  const value = values[control.path]
  const set = (next: ControlValue) =>
    ControlsStore.updateValue(panelId, control.path, next)

  switch (control.type) {
    case "folder": {
      const color = colorFolderOf(control)
      if (color) {
        const token = values[color.token.path]
        return (
          <>
            <SelectControl
              label={control.label}
              options={color.token.options ?? []}
              value={typeof token === "string" ? token : ""}
              onChange={(next) =>
                ControlsStore.updateValue(panelId, color.token.path, next)
              }
            />
            {color.custom && (
              <ColorControl
                label="Custom"
                value={
                  typeof values[color.custom.path] === "string"
                    ? (values[color.custom.path] as string)
                    : "#000000"
                }
                onChange={(next) =>
                  ControlsStore.updateValue(panelId, color.custom!.path, next)
                }
              />
            )}
          </>
        )
      }
      return (
        <Folder label={control.label} defaultOpen={control.defaultOpen ?? true}>
          <ControlList
            panelId={panelId}
            controls={control.children ?? []}
            values={values}
          />
        </Folder>
      )
    }
    case "slider":
      return (
        <SliderControl
          label={control.label}
          value={typeof value === "number" ? value : 0}
          min={control.min ?? 0}
          max={control.max ?? 1}
          step={control.step ?? 0.01}
          onChange={set}
        />
      )
    case "toggle":
      return (
        <ToggleControl
          label={control.label}
          checked={value === true}
          onChange={set}
        />
      )
    case "select":
      return (
        <SelectControl
          label={control.label}
          options={control.options ?? []}
          value={typeof value === "string" ? value : ""}
          onChange={set}
        />
      )
    case "text":
      return (
        <TextControl
          label={control.label}
          value={typeof value === "string" ? value : ""}
          placeholder={control.placeholder}
          onChange={set}
        />
      )
    case "color":
      return (
        <ColorControl
          label={control.label}
          value={typeof value === "string" ? value : "#000000"}
          onChange={set}
        />
      )
    case "pad":
      return (
        <PadControl
          label={control.label}
          pad={control.pad}
          value={isPadValue(value) ? value : { x: 0, y: 0 }}
          onChange={set}
        />
      )
    case "transition":
      return (
        <TransitionControl
          label={control.label}
          value={isTransitionConfig(value) ? value : { type: "spring" }}
          onChange={set}
        />
      )
  }
}
