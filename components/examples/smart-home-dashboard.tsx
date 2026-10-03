"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  BedDoubleIcon,
  BulbIcon,
  Car01Icon,
  ComputerIcon,
  DropletIcon,
  Fire03Icon,
  HumidityIcon,
  MinusSignIcon,
  MusicNote01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  PowerIcon,
  PreviousIcon,
  SnowflakeIcon,
  SofaIcon,
  SolarPanel02Icon,
  ToyBrickIcon,
  WashingMachineIcon,
  WindPowerIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Gauge,
  GaugeArc,
  GaugeControl,
  GaugeDot,
  GaugeHub,
  GaugeMarks,
  GaugeNeedle,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  clockTime,
  fadeColor,
  type GaugeTransition,
} from "@/components/gauge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/** Every gauge sweeps up from the foot of its domain as the tab opens. */
const ARRIVE: GaugeTransition = { type: "spring", visualDuration: 1, bounce: 0 }
/** Quick enough to keep up with a finger on a dial being dragged. */
const CONTROL: GaugeTransition = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"
/** Cuts drawn in the card's own colour, to split a band into segments. */
const CUT = "var(--card)"

/** The one ink every mark is drawn in, as the studio templates keep to. */
const INK = "var(--foreground)"

/** The ink thinned towards transparent, for the quieter tones. */
const fade = (percent: number) => fadeColor(INK, percent)

/** The sweep every control dial here turns through, open at the bottom. */
const SWEEP = { startAngle: 40, endAngle: 320 } as const
/** A full ring from twelve o'clock. */
const ring = { startAngle: 180, endAngle: 540 } as const
/** The top half of a dial, left to right. */
const half = { startAngle: 90, endAngle: 270, fit: "content" } as const

const pad = (n: number) => String(n).padStart(2, "0")

/** Seconds as "3:07". */
const minutesSeconds = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${pad(Math.floor(seconds % 60))}`

const clampTo = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value))

/** The time on the house's clock, in hours from midnight. */
const NOW = 14 + 10 / 60

/* ---------- ticking ---------- */

/**
 * Runs `tick` every `ms` while `active`, always calling the latest one so it
 * can read fresh state. Reduced motion holds everything where it is.
 */
const useInterval = (tick: () => void, ms: number, active: boolean) => {
  const latest = useRef(tick)
  useEffect(() => {
    latest.current = tick
  })
  useEffect(() => {
    if (!active) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => latest.current(), ms)
    return () => window.clearInterval(id)
  }, [ms, active])
}

/* ---------- climate ---------- */

type Mode = "heat" | "cool" | "off"

const MODES: { mode: Mode; label: string; icon: IconSvgElement }[] = [
  { mode: "heat", label: "Heat", icon: Fire03Icon },
  { mode: "cool", label: "Cool", icon: SnowflakeIcon },
  { mode: "off", label: "Off", icon: PowerIcon },
]

type Room = {
  id: string
  name: string
  icon: IconSvgElement
  /** °C */
  current: number
  target: number
}

const ROOMS: Room[] = [
  {
    id: "living",
    name: "Living room",
    icon: SofaIcon,
    current: 20.2,
    target: 21.5,
  },
  {
    id: "bedroom",
    name: "Bedroom",
    icon: BedDoubleIcon,
    current: 18.5,
    target: 18.5,
  },
  {
    id: "office",
    name: "Office",
    icon: ComputerIcon,
    current: 19.4,
    target: 21,
  },
  {
    id: "kids",
    name: "Kids' room",
    icon: ToyBrickIcon,
    current: 21.3,
    target: 20.5,
  },
]

/** °C the house settles to with nothing running. */
const AMBIENT = 16.5
const T_MIN = 10
const T_MAX = 30

/**
 * One step of the house warming or cooling. A room the system is working on
 * moves a tenth of a degree towards its setpoint; one already past it drifts
 * back slowly on its own, and with the system off every room settles towards
 * the ambient temperature.
 */
const stepRoom = (room: Room, mode: Mode): Room => {
  const { current, target } = room
  if (mode === "off") {
    return { ...room, current: current + (AMBIENT - current) * 0.01 }
  }
  const working = mode === "heat" ? current < target : current > target
  const towards = working ? 0.1 : 0.02
  const next =
    current < target
      ? Math.min(target, current + towards)
      : Math.max(target, current - towards)
  return { ...room, current: next }
}

const roomStatus = (room: Room, mode: Mode) => {
  if (mode === "off") return "Off"
  if (mode === "heat" && room.current < room.target - 0.05) return "Heating"
  if (mode === "cool" && room.current > room.target + 0.05) return "Cooling"
  return "Holding"
}

/* ---------- lights ---------- */

type Light = { id: string; name: string; on: boolean; level: number }

const LIGHTS: Light[] = [
  { id: "living", name: "Living room", on: true, level: 80 },
  { id: "kitchen", name: "Kitchen", on: true, level: 100 },
  { id: "bedroom", name: "Bedroom", on: false, level: 35 },
  { id: "porch", name: "Porch", on: true, level: 60 },
]

/* ---------- music ---------- */

type Track = { title: string; artist: string; length: number }

const TRACKS: Track[] = [
  { title: "Low Tide", artist: "Halcyon Drift", length: 214 },
  { title: "Glass Harbour", artist: "Halcyon Drift", length: 187 },
  { title: "Northern Static", artist: "Pale Meridian", length: 243 },
  { title: "Paper Lanterns", artist: "Ossa Vale", length: 201 },
]

type Music = {
  track: number
  position: number
  playing: boolean
  volume: number
}

/* ---------- ev ---------- */

/** kWh, and km on a full charge. */
const BATTERY = 77
const RANGE = 480
/** kW from the wall box. */
const CHARGE_RATE = 7.4
const START_SOC = 64

type Car = { soc: number; charging: boolean; limit: number }

/* ---------- energy ---------- */

type Power = { solar: number; home: number }

/** kW either way the dial reads, exporting to the left and importing right. */
const GRID_SPAN = 10

/* ---------- washer ---------- */

/** Seconds in the cycle, and where each phase ends as a share of it. */
const CYCLE = 58 * 60
const PHASES = [
  { name: "Washing", to: 0.6 },
  { name: "Rinsing", to: 0.85 },
  { name: "Spinning", to: 1 },
]

/* ---------- gauges ---------- */

/**
 * The thermostat: a ribbon of ticks round the face, filled between the room's
 * temperature and the setpoint so the gap the system is closing is the part
 * that stands out. The handle is the setpoint and turns with a drag; the
 * notch is where the room is now.
 */
const Thermostat = ({
  current,
  target,
  mode,
}: {
  current: number
  target: number
  mode: Mode
}) => {
  const off = mode === "off"
  const status =
    mode === "heat" ? "Heating to" : mode === "cool" ? "Cooling to" : "Off"
  return (
    <Gauge
      value={target}
      min={T_MIN}
      max={T_MAX}
      {...SWEEP}
      padding={20}
      transition={CONTROL}
      initialValue={T_MIN}
    >
      <GaugeTrack width={26} color={INK} opacity={0.1} cap="butt" />
      {/* Anchored at the room's temperature, the arc grows either way to the
          animated setpoint, so it springs with the handle as it is dragged. */}
      {!off && (
        <GaugeArc
          from={current}
          width={26}
          color={INK}
          opacity={0.4}
          cap="butt"
        />
      )}
      <GaugeTicks count={80} length={30} width={2.5} cap="butt" color={CUT} />
      <GaugeMarks
        values={[current]}
        length={40}
        width={4}
        color={off ? MUTED : INK}
      />
      {!off && <GaugeDot radius={14} color={INK} halo={6} haloColor={CUT} />}
      <GaugeText y={-74} fontSize={22} weight="semibold" color={MUTED}>
        {status.toUpperCase()}
      </GaugeText>
      {off ? (
        <GaugeText
          y={0}
          fontSize={96}
          font="rounded"
          weight="bold"
          color={MUTED}
        >
          {`${current.toFixed(1)}°`}
        </GaugeText>
      ) : (
        <GaugeValue
          y={0}
          fontSize={96}
          font="rounded"
          weight="bold"
          format={(v) => `${v.toFixed(1)}°`}
        />
      )}
      <GaugeText y={76} fontSize={24} color={MUTED}>
        {off ? "indoors" : `Now ${current.toFixed(1)}°`}
      </GaugeText>
    </Gauge>
  )
}

/**
 * A room's small dial: the room's temperature as a dot on the whole range,
 * and the stretch to its setpoint picked out on the track.
 */
const RoomDial = ({ room, mode }: { room: Room; mode: Mode }) => (
  <Gauge
    value={room.current}
    min={T_MIN}
    max={T_MAX}
    {...SWEEP}
    padding={32}
    transition={ARRIVE}
    initialValue={T_MIN}
  >
    <GaugeTrack width={40} color={INK} opacity={0.12} cap="butt" />
    {/* The stretch the system is closing, from the setpoint back to the
        (animated) room temperature, whichever side it is on. */}
    {mode !== "off" && (
      <GaugeArc
        from={room.target}
        width={40}
        color={INK}
        opacity={0.4}
        cap="butt"
      />
    )}
    <GaugeDot
      radius={22}
      color={mode === "off" ? MUTED : INK}
      halo={10}
      haloColor={CUT}
    />
  </Gauge>
)

/**
 * A dimmer: the brightness fills the sweep and a notch at its head is the
 * grip. Switched off, the fill stays where it was, faint, so the light comes
 * back on at the same level.
 */
const LightDial = ({ light }: { light: Light }) => (
  <Gauge
    value={light.level}
    max={100}
    {...SWEEP}
    padding={20}
    transition={CONTROL}
    initialValue={0}
  >
    <GaugeTrack width={40} color={INK} opacity={0.1} />
    <GaugeArc width={40} color={INK} opacity={light.on ? 1 : 0.2} />
    <GaugeDot radius={9} color={CUT} />
    {light.on ? (
      <GaugeValue
        y={-4}
        fontSize={84}
        font="rounded"
        weight="bold"
        format={(v) => `${Math.round(v)}%`}
      />
    ) : (
      <GaugeText
        y={-4}
        fontSize={72}
        font="rounded"
        weight="bold"
        color={MUTED}
      >
        Off
      </GaugeText>
    )}
  </Gauge>
)

/**
 * A hi-fi volume knob: a thin scale round the outside that fills with the
 * level, and a face with a single dot for its pointer, turned by a drag.
 */
const VolumeKnob = ({ volume }: { volume: number }) => (
  <Gauge
    value={volume}
    max={100}
    {...SWEEP}
    padding={24}
    transition={CONTROL}
    initialValue={0}
  >
    <GaugeTicks
      count={20}
      length={12}
      width={3}
      offset={6}
      color={MUTED}
      opacity={0.45}
    />
    <GaugeTrack width={6} offset={-18} color={INK} opacity={0.12} />
    <GaugeArc width={6} offset={-18} color={INK} />
    <GaugeHub radius={156} color={fade(7)} />
    <GaugeDot radius={11} offset={-76} color={INK} />
    <GaugeValue y={0} fontSize={64} font="rounded" weight="bold" />
  </Gauge>
)

/**
 * The car's battery on a full ring. The charge fills it, the stretch still to
 * go up to the charge limit is shaded, and the limit itself is a notch.
 */
const BatteryDial = ({ car, status }: { car: Car; status: string }) => (
  <Gauge
    value={car.soc}
    max={100}
    {...ring}
    padding={20}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={30} color={INK} opacity={0.1} cap="butt" />
    {car.soc < car.limit && (
      <GaugeArc
        from={car.soc}
        to={car.limit}
        width={30}
        color={INK}
        opacity={0.22}
        cap="butt"
      />
    )}
    <GaugeArc width={30} color={INK} cap="butt" />
    <GaugeMarks
      values={[car.limit]}
      length={46}
      width={5}
      cap="butt"
      color={INK}
    />
    <GaugeText y={-72} fontSize={22} weight="semibold" color={MUTED}>
      {status.toUpperCase()}
    </GaugeText>
    <GaugeValue
      y={0}
      fontSize={96}
      font="rounded"
      weight="bold"
      format={(v) => `${Math.round(v)}%`}
    />
    <GaugeText y={70} fontSize={24} color={MUTED}>
      {`${Math.round((car.soc / 100) * RANGE)} km`}
    </GaugeText>
  </Gauge>
)

/**
 * The grid connection on a half dial centred on zero: the needle leans left
 * while the house sends power out and right while it draws it in.
 */
const GridDial = ({ kw }: { kw: number }) => (
  <Gauge
    value={kw}
    min={-GRID_SPAN}
    max={GRID_SPAN}
    {...half}
    padding={56}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={20} color={INK} opacity={0.1} cap="butt" />
    {/* Anchored at zero, the arc grows out to the reading on either side. */}
    <GaugeArc from={0} width={20} color={INK} opacity={0.35} cap="butt" />
    <GaugeTicks
      count={20}
      length={8}
      width={2}
      offset={20}
      color={MUTED}
      opacity={0.5}
    />
    <GaugeTicks count={4} length={14} width={3} offset={23} cap="butt" />
    <GaugeTickLabels
      count={4}
      offset={58}
      fontSize={24}
      weight="semibold"
      color={MUTED}
      format={(v) => `${Math.abs(v)}`}
    />
    <GaugeNeedle style="pointer" length={0.9} width={18} tail={0} color={INK} />
    <GaugeHub radius={16} color={INK} />
  </Gauge>
)

/**
 * The small half dial on the tiles: the whole scale as a track and whatever
 * the reading needs drawn over it.
 */
const TileDial = ({
  value,
  min = 0,
  max,
  children,
}: {
  value: number
  min?: number
  max: number
  children: ReactNode
}) => (
  <Gauge
    value={value}
    min={min}
    max={max}
    {...half}
    padding={32}
    transition={ARRIVE}
    initialValue={min}
  >
    <GaugeTrack width={36} color={INK} opacity={0.14} cap="butt" />
    {children}
  </Gauge>
)

/** A band on the track for the healthy range, and a dot at the reading. */
const RangeMarks = ({ lo, hi }: { lo: number; hi: number }) => (
  <>
    <GaugeArc
      from={lo}
      to={hi}
      width={36}
      color={INK}
      opacity={0.4}
      cap="butt"
    />
    <GaugeDot radius={30} color={CUT} />
    <GaugeDot radius={20} color={INK} />
  </>
)

/* ---------- layout ---------- */

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

/** A reading set as a bold rounded figure with a small unit. */
const Figure = ({
  value,
  unit,
  className,
}: {
  value: ReactNode
  unit?: string
  className?: string
}) => (
  <span
    className={cn(
      "font-rounded text-2xl font-bold tracking-tight tabular-nums",
      className
    )}
  >
    {value}
    {unit && (
      <span className="ml-1 text-xs font-bold whitespace-nowrap text-muted-foreground uppercase">
        {unit}
      </span>
    )}
  </span>
)

/** A section heading, its icon in the muted tone. */
const Category = ({
  icon,
  children,
}: {
  icon: IconSvgElement
  children: ReactNode
}) => (
  <span className="flex items-center gap-1.5 text-sm font-semibold">
    <HugeiconsIcon
      icon={icon}
      strokeWidth={2}
      className="size-4 text-muted-foreground"
    />
    {children}
  </span>
)

const Panel = ({
  heading,
  action,
  className,
  children,
}: {
  heading: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <Card size="sm" className={cn("shadow-none", className)}>
    <CardHeader>
      <CardTitle>{heading}</CardTitle>
      {action && (
        <CardAction className="text-xs text-muted-foreground tabular-nums">
          {action}
        </CardAction>
      )}
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-center gap-5">
      {children}
    </CardContent>
  </Card>
)

type Row = { label: string; value: ReactNode }

const Readouts = ({ rows }: { rows: Row[] }) => (
  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
    {rows.map(({ label, value }) => (
      <div key={label} className="contents">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-right font-medium tabular-nums">{value}</dd>
      </div>
    ))}
  </dl>
)

/** A tile: the category, the figure, a small dial and a caption. */
const Tile = ({
  icon,
  label,
  value,
  unit,
  caption,
  children,
}: {
  icon: IconSvgElement
  label: string
  value: string
  unit?: string
  caption: string
  children: ReactNode
}) => (
  <Card size="sm" className="shadow-none">
    <CardContent className="flex flex-col gap-3">
      <Category icon={icon}>
        <span className="truncate text-xs">{label}</span>
      </Category>
      <div className="flex items-end justify-between gap-2">
        <Figure value={value} unit={unit} />
        <div className="w-14 shrink-0 pb-1 sm:w-16">{children}</div>
      </div>
      <Caption>{caption}</Caption>
    </CardContent>
  </Card>
)

/** A row of buttons of which one is chosen, the chosen one filled. */
const Segmented = <T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: IconSvgElement }[]
  value: T
  onChange: (value: T) => void
  label: string
}) => (
  <div role="group" aria-label={label} className="flex gap-1">
    {options.map((o) => (
      <Button
        key={o.value}
        variant={o.value === value ? "secondary" : "ghost-muted"}
        size="xs"
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
      >
        {o.icon && <HugeiconsIcon icon={o.icon} data-icon="inline-start" />}
        {o.label}
      </Button>
    ))}
  </div>
)

/* ---------- sections ---------- */

const Climate = ({
  rooms,
  selected,
  mode,
  onSelect,
  onTarget,
  onMode,
}: {
  rooms: Room[]
  selected: number
  mode: Mode
  onSelect: (index: number) => void
  onTarget: (target: number) => void
  onMode: (mode: Mode) => void
}) => {
  const room = rooms[selected]
  const nudge = (by: number) =>
    onTarget(clampTo(room.target + by, T_MIN, T_MAX))
  return (
    <Panel
      heading={<Category icon={Fire03Icon}>Climate</Category>}
      action={
        <Segmented
          label="Mode"
          value={mode}
          onChange={onMode}
          options={MODES.map(({ mode, label, icon }) => ({
            value: mode,
            label,
            icon,
          }))}
        />
      }
      className="sm:col-span-2"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center">
        <div className="mx-auto flex w-full max-w-60 flex-col items-center gap-3">
          <GaugeControl
            value={room.target}
            onChange={onTarget}
            min={T_MIN}
            max={T_MAX}
            step={0.5}
            {...SWEEP}
            label={`${room.name} setpoint`}
            valueText={`${room.target.toFixed(1)} °C`}
            disabled={mode === "off"}
            className="w-full"
          >
            <Thermostat
              current={room.current}
              target={room.target}
              mode={mode}
            />
          </GaugeControl>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => nudge(-0.5)}
              disabled={mode === "off" || room.target <= T_MIN}
              aria-label="Half a degree cooler"
            >
              <HugeiconsIcon icon={MinusSignIcon} />
            </Button>
            <span className="w-20 text-center text-xs text-muted-foreground">
              {room.name}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => nudge(0.5)}
              disabled={mode === "off" || room.target >= T_MAX}
              aria-label="Half a degree warmer"
            >
              <HugeiconsIcon icon={PlusSignIcon} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={i === selected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border p-3 text-left",
                "outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                i === selected && "bg-muted/50"
              )}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <HugeiconsIcon
                    icon={r.icon}
                    strokeWidth={2}
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{r.name}</span>
                </span>
                <Figure
                  value={`${r.current.toFixed(1)}°`}
                  className="text-xl"
                />
                <Caption>
                  {roomStatus(r, mode)}
                  {mode !== "off" && ` · ${r.target.toFixed(1)}°`}
                </Caption>
              </span>
              <span className="w-12 shrink-0 sm:w-14">
                <RoomDial room={r} mode={mode} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}

const Lights = ({
  lights,
  onChange,
}: {
  lights: Light[]
  onChange: (id: string, change: Partial<Light>) => void
}) => {
  const on = lights.filter((l) => l.on).length
  return (
    <Panel
      heading={<Category icon={BulbIcon}>Lights</Category>}
      action={
        <Button
          variant="ghost-muted"
          size="xs"
          disabled={on === 0}
          onClick={() => lights.forEach((l) => onChange(l.id, { on: false }))}
        >
          {`${on} on · All off`}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {lights.map((light) => (
          <div key={light.id} className="flex flex-col items-center gap-2">
            <GaugeControl
              value={light.level}
              onChange={(level) => onChange(light.id, { level, on: true })}
              onPress={() => onChange(light.id, { on: !light.on })}
              min={1}
              max={100}
              step={1}
              {...SWEEP}
              label={`${light.name} brightness`}
              valueText={light.on ? `${light.level}%` : "Off"}
              className="w-full max-w-32"
            >
              <LightDial light={light} />
            </GaugeControl>
            <div className="flex w-full max-w-32 items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{light.name}</span>
              <Switch
                size="sm"
                checked={light.on}
                onCheckedChange={(checked) =>
                  onChange(light.id, { on: checked })
                }
                aria-label={`${light.name} light`}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const MusicPanel = ({
  music,
  onChange,
}: {
  music: Music
  onChange: (change: Partial<Music>) => void
}) => {
  const track = TRACKS[music.track]
  const skip = (by: number) =>
    onChange({
      track: (music.track + by + TRACKS.length) % TRACKS.length,
      position: 0,
    })
  return (
    <Panel
      heading={<Category icon={MusicNote01Icon}>Music</Category>}
      action="Living room · Kitchen"
    >
      <div className="grid grid-cols-2 items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <GaugeControl
            value={music.volume}
            onChange={(volume) => onChange({ volume })}
            min={0}
            max={100}
            step={1}
            {...SWEEP}
            label="Volume"
            valueText={`${music.volume}%`}
            knob
            className="w-full"
          >
            <VolumeKnob volume={music.volume} />
          </GaugeControl>
          <Caption>Volume</Caption>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex aspect-square w-full max-w-24 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon
              icon={MusicNote01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground"
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              {track.title}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {track.artist}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div
              className="h-1 overflow-hidden rounded-full"
              style={{ background: fade(14) }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${(music.position / track.length) * 100}%`,
                  background: INK,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{minutesSeconds(music.position)}</span>
              <span>-{minutesSeconds(track.length - music.position)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost-muted"
              size="icon-sm"
              onClick={() => skip(-1)}
              aria-label="Previous track"
            >
              <HugeiconsIcon icon={PreviousIcon} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onChange({ playing: !music.playing })}
              aria-label={music.playing ? "Pause" : "Play"}
            >
              <HugeiconsIcon icon={music.playing ? PauseIcon : PlayIcon} />
            </Button>
            <Button
              variant="ghost-muted"
              size="icon-sm"
              onClick={() => skip(1)}
              aria-label="Next track"
            >
              <HugeiconsIcon icon={NextIcon} />
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  )
}

const Tiles = ({ room, washer }: { room: Room; washer: number }) => {
  const progress = washer / CYCLE
  const phase = PHASES.find((p) => progress < p.to) ?? PHASES[PHASES.length - 1]
  const left = CYCLE - washer
  const done = left <= 0
  return (
    <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
      <Tile
        icon={WindPowerIcon}
        label="Air quality"
        value="612"
        unit="ppm"
        caption="CO₂, fresh below 800"
      >
        <TileDial value={612} min={400} max={1600}>
          <RangeMarks lo={400} hi={800} />
        </TileDial>
      </Tile>
      <Tile
        icon={HumidityIcon}
        label="Humidity"
        value="44"
        unit="%"
        caption={`${room.name}, 30–60%`}
      >
        <TileDial value={44} max={100}>
          <RangeMarks lo={30} hi={60} />
        </TileDial>
      </Tile>
      <Tile
        icon={DropletIcon}
        label="Water"
        value="184"
        unit="L"
        caption="Today, of 250 L average"
      >
        {/* A plain fill, cut into quarters. */}
        <TileDial value={184} max={250}>
          <GaugeArc width={36} color={INK} cap="butt" />
          <GaugeMarks count={4} length={40} width={6} cap="butt" color={CUT} />
        </TileDial>
      </Tile>
      <Tile
        icon={WashingMachineIcon}
        label="Washer"
        value={done ? "Done" : `${Math.ceil(left / 60)}`}
        unit={done ? undefined : "min"}
        caption={
          done ? "Ready to unload" : `${phase.name} · ${minutesSeconds(left)}`
        }
      >
        {/* The cycle so far, cut where one phase hands over to the next. */}
        <TileDial value={progress} max={1}>
          <GaugeArc width={36} color={INK} cap="butt" />
          <GaugeMarks
            values={PHASES.slice(0, -1).map((p) => p.to)}
            length={40}
            width={6}
            cap="butt"
            color={CUT}
          />
        </TileDial>
      </Tile>
    </div>
  )
}

const LIMITS = [80, 90, 100]

const Charging = ({
  car,
  onChange,
}: {
  car: Car
  onChange: (change: Partial<Car>) => void
}) => {
  const full = car.soc >= car.limit
  const status = full ? "Complete" : car.charging ? "Charging" : "Paused"
  const hoursLeft = ((car.limit - car.soc) / 100) * (BATTERY / CHARGE_RATE)
  return (
    <Panel
      heading={<Category icon={Car01Icon}>EV charging</Category>}
      action="Wall box · 32 A"
    >
      <div className="grid grid-cols-2 items-center gap-6">
        <BatteryDial car={car} status={status} />
        <Readouts
          rows={[
            {
              label: "Rate",
              value: car.charging && !full ? `${CHARGE_RATE} kW` : "—",
            },
            {
              label: "Added",
              value: `${(((car.soc - START_SOC) / 100) * BATTERY).toFixed(1)} kWh`,
            },
            { label: "Limit", value: `${car.limit}%` },
            {
              label: "Ready",
              value: full
                ? "Now"
                : car.charging
                  ? clockTime(NOW + hoursLeft)
                  : "—",
            },
          ]}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="xs"
          disabled={full}
          onClick={() => onChange({ charging: !car.charging })}
          className="min-w-20"
        >
          <HugeiconsIcon
            icon={car.charging ? PauseIcon : PlayIcon}
            data-icon="inline-start"
          />
          {car.charging ? "Pause" : "Resume"}
        </Button>
        <Segmented
          label="Charge limit"
          value={car.limit}
          onChange={(limit) => onChange({ limit })}
          options={LIMITS.map((l) => ({ value: l, label: `${l}%` }))}
        />
      </div>
    </Panel>
  )
}

const Energy = ({ power, ev }: { power: Power; ev: number }) => {
  const grid = power.home + ev - power.solar
  return (
    <Panel
      heading={<Category icon={SolarPanel02Icon}>Energy</Category>}
      action={
        grid >= 0
          ? `Importing ${grid.toFixed(1)} kW`
          : `Exporting ${(-grid).toFixed(1)} kW`
      }
    >
      <div className="grid grid-cols-2 items-center gap-6">
        <div className="flex flex-col gap-1">
          <GridDial kw={grid} />
          <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
            <span>Export</span>
            <span>Import</span>
          </div>
        </div>
        <Readouts
          rows={[
            { label: "Solar", value: `${power.solar.toFixed(1)} kW` },
            { label: "House", value: `${power.home.toFixed(1)} kW` },
            { label: "Car", value: `${ev.toFixed(1)} kW` },
            { label: "Today", value: "18.6 kWh made" },
          ]}
        />
      </div>
    </Panel>
  )
}

/**
 * A smart home on gauges you can turn: a thermostat per room that warms the
 * room towards its setpoint, dimmers for the lights, a volume knob beside
 * what is playing, the car charging to its limit, the grid connection
 * leaning between export and import as the car and the sun change, and
 * tiles for the air, the water and the washer.
 */
export const SmartHomeDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const visible = useInView(frame)

  const [rooms, setRooms] = useState(ROOMS)
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<Mode>("heat")
  const [lights, setLights] = useState(LIGHTS)
  const [music, setMusic] = useState<Music>({
    track: 0,
    position: 72,
    playing: true,
    volume: 42,
  })
  const [car, setCar] = useState<Car>({
    soc: START_SOC,
    charging: true,
    limit: 80,
  })
  const [power, setPower] = useState<Power>({ solar: 3.4, home: 1.2 })
  const [washer, setWasher] = useState(CYCLE - 23 * 60 - 14)

  const ev = car.charging && car.soc < car.limit ? CHARGE_RATE : 0

  /* The slow things: rooms, the car and the sun, every second and a half. */
  useInterval(
    () => {
      setRooms((rs) => rs.map((r) => stepRoom(r, mode)))
      setCar((c) =>
        c.charging && c.soc < c.limit
          ? { ...c, soc: Math.min(c.limit, c.soc + 0.1) }
          : c
      )
      setPower((p) => ({
        solar: clampTo(p.solar + (Math.random() * 2 - 1) * 0.25, 2.6, 4.2),
        home: clampTo(p.home + (Math.random() * 2 - 1) * 0.15, 0.8, 1.8),
      }))
    },
    1500,
    visible
  )

  /* The clocks: the song and the washer, every second. */
  useInterval(
    () => {
      setWasher((w) => Math.min(CYCLE, w + 1))
      setMusic((m) => {
        if (!m.playing) return m
        const length = TRACKS[m.track].length
        return m.position + 1 >= length
          ? { ...m, track: (m.track + 1) % TRACKS.length, position: 0 }
          : { ...m, position: m.position + 1 }
      })
    },
    1000,
    visible
  )

  const setTarget = (target: number) =>
    setRooms((rs) => rs.map((r, i) => (i === selected ? { ...r, target } : r)))

  const changeLight = (id: string, change: Partial<Light>) =>
    setLights((ls) => ls.map((l) => (l.id === id ? { ...l, ...change } : l)))

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Climate
        rooms={rooms}
        selected={selected}
        mode={mode}
        onSelect={setSelected}
        onTarget={setTarget}
        onMode={setMode}
      />
      <Lights lights={lights} onChange={changeLight} />
      <MusicPanel
        music={music}
        onChange={(change) => setMusic((m) => ({ ...m, ...change }))}
      />
      <Tiles room={rooms[0]} washer={washer} />
      <Charging
        car={car}
        onChange={(change) => setCar((c) => ({ ...c, ...change }))}
      />
      <Energy power={power} ev={ev} />
    </div>
  )
}
