/**
 * The studio's own control-panel kit, in the spirit of dialkit but owned by
 * this codebase: a panel is a plain config object — sliders as
 * `[default, min, max, step]` tuples, toggles as booleans, selects, colours,
 * XY pads, transitions and nested folders — parsed once into control metadata
 * and a flat value map keyed by dotted path. React reads it through
 * `useControlPanel` and `ControlsRoot` renders it with shadcn components.
 * There are no presets, no persistence and no timeline: the studio keeps its
 * own state in layers.
 */

/* ---------- config shapes ---------- */

/** The `[default, min, max, step?]` notation used by sliders and pad axes. */
export type SliderTuple = [number, number, number, number?]

export type SpringConfig = {
  type: "spring"
  stiffness?: number
  damping?: number
  mass?: number
  visualDuration?: number
  bounce?: number
}

export type EasingConfig = {
  type: "easing"
  duration: number
  ease: [number, number, number, number]
}

export type TransitionConfig = SpringConfig | EasingConfig

/** A swatch paints a dot beside the label, for options that name a colour. */
export type SelectOption =
  | string
  | { value: string; label: string; swatch?: string }

export type SelectConfig = {
  type: "select"
  options: SelectOption[]
  default?: string
}

export type TextConfig = { type: "text"; default?: string; placeholder?: string }

export type PadAxis = SliderTuple
export type PadValue = { x: number; y: number }
export type PadConfig = {
  type: "pad"
  /** Defaults to [0, -1, 1, 0.01]. */
  x?: PadAxis
  /** Positive Y points upward. Defaults to [0, -1, 1, 0.01]. */
  y?: PadAxis
}

export type ControlValue =
  | number
  | boolean
  | string
  | TransitionConfig
  | SelectConfig
  | TextConfig
  | PadConfig
  | PadValue

export type ControlConfig = {
  [key: string]: ControlValue | SliderTuple | ControlConfig
}

/** A panel config resolved to the values its controls currently hold. */
export type ResolvedValues<T extends ControlConfig> = {
  [K in keyof T]: T[K] extends SliderTuple
    ? number
    : T[K] extends SpringConfig
      ? TransitionConfig
      : T[K] extends EasingConfig
        ? TransitionConfig
        : T[K] extends SelectConfig
          ? string
          : T[K] extends TextConfig
            ? string
            : T[K] extends PadConfig
              ? PadValue
              : T[K] extends ControlConfig
                ? ResolvedValues<T[K]>
                : T[K]
}

/** A partial, nested update in the shape `setValues` accepts. */
export type ControlValueUpdates<T extends ControlConfig> = {
  [K in keyof T as K extends "_collapsed" ? never : K]?: T[K] extends SliderTuple
    ? number
    : T[K] extends SpringConfig | EasingConfig
      ? TransitionConfig
      : T[K] extends SelectConfig | TextConfig
        ? string
        : T[K] extends PadConfig
          ? PadValue
          : T[K] extends ControlConfig
            ? ControlValueUpdates<T[K]>
            : T[K]
}

/* ---------- control metadata ---------- */

export type ControlType =
  | "slider"
  | "toggle"
  | "select"
  | "text"
  | "color"
  | "pad"
  | "transition"
  | "folder"

export type ControlMeta = {
  type: ControlType
  /** The control's dotted path within its panel. */
  path: string
  label: string
  min?: number
  max?: number
  step?: number
  options?: SelectOption[]
  placeholder?: string
  pad?: PadConfig
  defaultOpen?: boolean
  children?: ControlMeta[]
}

export type FlatValues = Record<string, ControlValue>

export type PanelConfig = {
  id: string
  name: string
  controls: ControlMeta[]
  defaultCollapsed: boolean
}

/* ---------- helpers ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const hasType = (v: unknown, type: string) => isRecord(v) && v.type === type

export const isTransitionConfig = (v: unknown): v is TransitionConfig =>
  hasType(v, "spring") || hasType(v, "easing")

const isSelectConfig = (v: unknown): v is SelectConfig =>
  hasType(v, "select") && Array.isArray((v as SelectConfig).options)

const isTextConfig = (v: unknown): v is TextConfig => hasType(v, "text")

const isPadConfig = (v: unknown): v is PadConfig => hasType(v, "pad")

export const isPadValue = (v: unknown): v is PadValue =>
  isRecord(v) && typeof v.x === "number" && typeof v.y === "number"

/** Any typed leaf; every other plain object in a config is a folder. */
const isFolderConfig = (v: unknown): v is ControlConfig =>
  isRecord(v) &&
  !isTransitionConfig(v) &&
  !isSelectConfig(v) &&
  !isTextConfig(v) &&
  !isPadConfig(v) &&
  !isPadValue(v)

export const isHexColor = (value: string) =>
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)

/** `startAngle` reads as "Start Angle" on its row. */
export const formatLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()

const inferStep = (min: number, max: number) => {
  const range = max - min
  if (range <= 1) return 0.01
  if (range <= 10) return 0.1
  if (range <= 100) return 1
  return 10
}

/** A sensible range around a bare number, for configs that give only that. */
const inferRange = (value: number) => {
  if (value >= 0 && value <= 1) return { min: 0, max: 1, step: 0.01 }
  if (value >= 0 && value <= 10) return { min: 0, max: value * 3 || 10, step: 0.1 }
  if (value >= 0 && value <= 100)
    return { min: 0, max: value * 3 || 100, step: 1 }
  if (value >= 0) return { min: 0, max: value * 3 || 1000, step: 10 }
  return { min: value * 3, max: -value * 3, step: 1 }
}

/** How many decimals a step needs to print without loss. */
export const stepDecimals = (step: number) =>
  step > 0 && step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0

/** Clamps into `[min, max]` and snaps onto the step grid anchored at `min`. */
export const snapToStep = (
  value: number,
  step: number | undefined,
  min: number,
  max: number
) => {
  const clamped = Math.min(max, Math.max(min, value))
  if (!step || step <= 0 || !Number.isFinite(clamped)) return clamped
  const base = Number.isFinite(min) ? min : 0
  const snapped = base + Math.round((clamped - base) / step) * step
  /* Re-round to shed float noise like 0.30000000000000004. */
  const tidy = Number(snapped.toFixed(stepDecimals(step) + 2))
  return Math.min(max, Math.max(min, tidy))
}

const optionValue = (option: SelectOption) =>
  typeof option === "string" ? option : option.value

/** A leaf's default: tuples take their head, typed configs their `default`. */
const leafDefault = (raw: unknown): ControlValue => {
  if (Array.isArray(raw)) return raw[0] as number
  if (isSelectConfig(raw))
    return raw.default ?? (raw.options.length ? optionValue(raw.options[0]) : "")
  if (isTextConfig(raw)) return raw.default ?? ""
  if (isPadConfig(raw)) return { x: raw.x?.[0] ?? 0, y: raw.y?.[0] ?? 0 }
  return raw as ControlValue
}

/* ---------- parsing ---------- */

type ParsedConfig = {
  controls: ControlMeta[]
  defaults: FlatValues
  byPath: Map<string, ControlMeta>
}

/** Compiles a config into controls, defaults and a path index in one walk. */
export const parseConfig = (config: ControlConfig): ParsedConfig => {
  const defaults: FlatValues = {}
  const byPath = new Map<string, ControlMeta>()

  const visit = (cfg: ControlConfig, prefix: string): ControlMeta[] => {
    const controls: ControlMeta[] = []
    for (const [key, raw] of Object.entries(cfg)) {
      if (key === "_collapsed") continue
      const path = prefix ? `${prefix}.${key}` : key
      const label = formatLabel(key)
      let control: ControlMeta | undefined
      if (Array.isArray(raw) && typeof raw[0] === "number") {
        control = {
          type: "slider",
          path,
          label,
          min: raw[1],
          max: raw[2],
          step: raw[3] ?? inferStep(raw[1], raw[2]),
        }
      } else if (typeof raw === "number") {
        control = { type: "slider", path, label, ...inferRange(raw) }
      } else if (typeof raw === "boolean") {
        control = { type: "toggle", path, label }
      } else if (isTransitionConfig(raw)) {
        control = { type: "transition", path, label }
      } else if (isSelectConfig(raw)) {
        control = { type: "select", path, label, options: raw.options }
      } else if (isTextConfig(raw)) {
        control = { type: "text", path, label, placeholder: raw.placeholder }
      } else if (isPadConfig(raw)) {
        control = { type: "pad", path, label, pad: raw }
      } else if (typeof raw === "string") {
        /* A bare hex string is a colour to pick; any other string is text. */
        control = { type: isHexColor(raw) ? "color" : "text", path, label }
      } else if (isRecord(raw)) {
        const folder = raw as ControlConfig
        control = {
          type: "folder",
          path,
          label,
          defaultOpen: !folder._collapsed,
          children: visit(folder, path),
        }
      }
      if (!control) continue
      controls.push(control)
      byPath.set(path, control)
      if (control.type !== "folder") defaults[path] = leafDefault(raw)
    }
    return controls
  }

  return { controls: visit(config, ""), defaults, byPath }
}

/** Nests a panel's flat values back into the shape of its config. */
export const resolveValues = <T extends ControlConfig>(
  config: T,
  flat: FlatValues
): ResolvedValues<T> => {
  const visit = (cfg: ControlConfig, prefix: string): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(cfg)) {
      if (key === "_collapsed") continue
      const path = prefix ? `${prefix}.${key}` : key
      if (isFolderConfig(raw)) out[key] = visit(raw, path)
      else out[key] = flat[path] !== undefined ? flat[path] : leafDefault(raw)
    }
    return out
  }
  return visit(config, "") as ResolvedValues<T>
}

/**
 * Flattens a nested update into dotted paths, guided by the config: keys the
 * config does not know are dropped. A control that only exists once another
 * value brings it into being — a colour's custom hex — is picked up on a
 * later pass, once the panel has rebuilt around that value.
 */
export const flattenUpdates = (
  config: ControlConfig,
  updates: unknown
): FlatValues => {
  const out: FlatValues = {}
  const visit = (
    cfg: ControlConfig,
    ups: Record<string, unknown>,
    prefix: string
  ) => {
    for (const [key, value] of Object.entries(ups)) {
      if (value === undefined || key === "_collapsed") continue
      const raw = cfg[key]
      if (raw === undefined) continue
      const path = prefix ? `${prefix}.${key}` : key
      if (isFolderConfig(raw)) {
        if (isRecord(value)) visit(raw, value, path)
      } else {
        out[path] = value as ControlValue
      }
    }
  }
  if (isRecord(updates)) visit(config, updates, "")
  return out
}

/**
 * Keeps an existing value across a panel rebuild when it still fits the
 * control, normalised to it: sliders clamp and snap to the new range, selects
 * fall back when their option is gone. A transition keeps whichever shape it
 * has — a spring switched to an easing should not snap back on a rebuild.
 */
const normalizeValue = (
  control: ControlMeta,
  existing: ControlValue | undefined,
  fallback: ControlValue
): ControlValue => {
  if (existing === undefined) return fallback
  switch (control.type) {
    case "slider":
      return typeof existing === "number" && Number.isFinite(existing)
        ? snapToStep(
            existing,
            control.step,
            control.min ?? -Infinity,
            control.max ?? Infinity
          )
        : fallback
    case "toggle":
      return typeof existing === "boolean" ? existing : fallback
    case "select":
      return typeof existing === "string" &&
        (control.options ?? []).some((o) => optionValue(o) === existing)
        ? existing
        : fallback
    case "text":
    case "color":
      return typeof existing === "string" ? existing : fallback
    case "pad": {
      if (!isPadValue(existing)) return fallback
      const clampAxis = (value: number, axis?: PadAxis) =>
        axis
          ? snapToStep(value, axis[3] ?? inferStep(axis[1], axis[2]), axis[1], axis[2])
          : value
      const x = clampAxis(existing.x, control.pad?.x)
      const y = clampAxis(existing.y, control.pad?.y)
      return x === existing.x && y === existing.y ? existing : { x, y }
    }
    case "transition":
      return isTransitionConfig(existing) ? existing : fallback
    default:
      return fallback
  }
}

/* ---------- the store ---------- */

type Listener = () => void

const EMPTY_VALUES: FlatValues = {}

export type PanelOptions = { defaultCollapsed?: boolean }

class ControlsStoreClass {
  private panels = new Map<string, PanelConfig>()
  private values = new Map<string, FlatValues>()
  private byPanel = new Map<string, Map<string, ControlMeta>>()
  private defaults = new Map<string, FlatValues>()
  /* Values kept across an unmount, so strict mode's double mount and a panel
     coming back later pick up where they left off. */
  private retained = new Map<string, FlatValues>()
  private listeners = new Map<string, Set<Listener>>()
  private globalListeners = new Set<Listener>()
  private snapshot: PanelConfig[] = []

  registerPanel(
    id: string,
    name: string,
    config: ControlConfig,
    options: PanelOptions = {}
  ) {
    const previous =
      this.retained.get(id) ?? this.values.get(id) ?? EMPTY_VALUES
    this.setPanel(id, name, config, options, previous)
  }

  updatePanel(
    id: string,
    name: string,
    config: ControlConfig,
    options: PanelOptions = {}
  ) {
    const previous =
      this.values.get(id) ?? this.retained.get(id) ?? EMPTY_VALUES
    this.setPanel(id, name, config, options, previous)
  }

  unregisterPanel(id: string) {
    const values = this.values.get(id)
    if (values) this.retained.set(id, values)
    this.panels.delete(id)
    this.values.delete(id)
    this.byPanel.delete(id)
    this.defaults.delete(id)
    this.notifyGlobal()
  }

  private setPanel(
    id: string,
    name: string,
    config: ControlConfig,
    options: PanelOptions,
    previous: FlatValues
  ) {
    const { controls, defaults, byPath } = parseConfig(config)
    /* Values whose control has left the config stay put — a custom colour
       keeps its hex while the token select is off "custom" — and every value
       the config still has is normalised to its rebuilt control. */
    const values: FlatValues = { ...previous }
    for (const [path, control] of byPath) {
      if (control.type === "folder") continue
      values[path] = normalizeValue(control, previous[path], defaults[path])
    }
    this.panels.set(id, {
      id,
      name,
      controls,
      defaultCollapsed: options.defaultCollapsed ?? false,
    })
    this.values.set(id, values)
    this.byPanel.set(id, byPath)
    this.defaults.set(id, defaults)
    this.retained.delete(id)
    this.notifyGlobal()
    this.notify(id)
  }

  /** A panel's current values, flat and keyed by dotted path. */
  getValues = (id: string): FlatValues => this.values.get(id) ?? EMPTY_VALUES

  /** Every registered panel, in registration order. */
  getPanels = (): PanelConfig[] => this.snapshot

  updateValue(id: string, path: string, value: ControlValue) {
    this.updateValues(id, { [path]: value })
  }

  updateValues(id: string, updates: FlatValues) {
    const values = this.values.get(id)
    if (!values) return
    const byPath = this.byPanel.get(id)
    const defaults = this.defaults.get(id) ?? EMPTY_VALUES
    let changed = false
    const next = { ...values }
    for (const [path, value] of Object.entries(updates)) {
      const control = byPath?.get(path)
      const normalized = control
        ? normalizeValue(control, value, defaults[path] ?? value)
        : value
      if (!Object.is(next[path], normalized)) {
        next[path] = normalized
        changed = true
      }
    }
    if (!changed) return
    this.values.set(id, next)
    this.notify(id)
  }

  subscribe = (id: string, listener: Listener) => {
    let set = this.listeners.get(id)
    if (!set) {
      set = new Set()
      this.listeners.set(id, set)
    }
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(id)
    }
  }

  subscribeGlobal = (listener: Listener) => {
    this.globalListeners.add(listener)
    return () => {
      this.globalListeners.delete(listener)
    }
  }

  private notify(id: string) {
    this.listeners.get(id)?.forEach((fn) => fn())
  }

  private notifyGlobal() {
    this.snapshot = Array.from(this.panels.values())
    this.globalListeners.forEach((fn) => fn())
  }
}

export const ControlsStore = new ControlsStoreClass()
