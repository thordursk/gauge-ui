"use client"

import { useRef, type ReactNode } from "react"
import {
  EnergyIcon,
  RacingFlagIcon,
  Route01Icon,
  TireIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  GaugeArc,
  GaugeDot,
  GaugeMarks,
  GaugeText,
  GaugeTickFill,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  LinearGauge,
  fadeColor,
  type GaugeTransition,
} from "@/components/gauge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  CORNERS,
  LAP_LENGTH,
  SECTOR_STARTS,
  useLapSimulation,
  type Telemetry,
} from "./lap-simulation"

/** Quick and without overshoot, so twenty readings a second glide together. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.15,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"
/** Drawn in the card's own colour, to cut a band into segments. */
const CUT = "var(--card)"

/** The one ink every mark is drawn in, as the studio templates keep to. */
const INK = "var(--foreground)"

/** The ink thinned towards transparent, for the quieter tones. */
const fade = (percent: number) => fadeColor(INK, percent)

/** The tyres' working window, °C. */
const WINDOW = [90, 105] as const
/** kg a lap burns, for the laps-left estimate. */
const FUEL_PER_LAP = 2.4
const FULL_TANK = 40
/** kW the hybrid deploys or harvests at most. */
const ERS_MAX = 120

/** Bar length for the narrow columns, so their bars and labels draw near
    their own size rather than scaled down from the default 400. */
const SHORT = 240

const pad = (n: number, width = 2) => String(n).padStart(width, "0")

/** Seconds as a lap time, "1:19.950". */
const lapClock = (seconds: number) => {
  const ms = Math.round(seconds * 1000)
  return `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
}

/** A gap in seconds, signed: "+0.214" behind, "−0.088" ahead. */
const gapText = (seconds: number) =>
  `${seconds < 0 ? "−" : "+"}${Math.abs(seconds).toFixed(3)}`

/* ---------- gauges ---------- */

/**
 * The shift lights across the top of the wheel, lighting up through the
 * last three thousand revs in rising shades. At the limiter the whole strip
 * flashes.
 */
const ShiftLights = ({ rpm, clock }: { rpm: number; clock: number }) => {
  const limiter = rpm >= 11.8 && Math.floor(clock * 10) % 2 === 0
  return (
    <LinearGauge value={rpm} min={9} max={12} length={600} padding={14}>
      <GaugeTickFill
        count={14}
        length={0}
        width={22}
        color={(v) =>
          limiter ? fade(15) : v < 10.2 ? fade(45) : v < 11.2 ? fade(70) : INK
        }
        dimColor={fade(8)}
      />
    </LinearGauge>
  )
}

/** A pedal's travel as a tall bar, cut into quarters. */
const Pedal = ({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <LinearGauge
      value={value * 100}
      orientation="vertical"
      length={200}
      transition={FOLLOW}
      padding={{ top: 2, bottom: 2, left: 22, right: 22 }}
      className="h-32"
    >
      <GaugeTrack width={44} cap="butt" color={INK} opacity={0.1} />
      <GaugeArc width={44} cap="butt" color={color} />
      <GaugeMarks count={4} length={44} width={3} color={CUT} />
    </LinearGauge>
    <span className="text-xs font-semibold tabular-nums">
      {Math.round(value * 100)}%
    </span>
    <Caption>{label}</Caption>
  </div>
)

/** The revs on a tape, with the band past the shift point marked above it. */
const RevTape = ({ rpm }: { rpm: number }) => (
  <LinearGauge
    value={rpm}
    min={4}
    max={12}
    transition={FOLLOW}
    padding={{ top: 14, bottom: 30, left: 8, right: 8 }}
  >
    <GaugeArc from={11} to={12} width={4} offset={13} color={INK} cap="butt" />
    <GaugeTrack width={12} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc width={12} cap="butt" color={INK} />
    <GaugeTicks count={16} offset={-12} length={4} width={1.5} color={MUTED} />
    <GaugeTickLabels
      count={4}
      offset={-24}
      fontSize={12}
      color={MUTED}
      format={(v) => `${v}k`}
    />
  </LinearGauge>
)

/** Steering lock either way from straight ahead, the wheel's angle a dot. */
const SteeringBar = ({ degrees }: { degrees: number }) => (
  <LinearGauge
    value={degrees}
    min={-180}
    max={180}
    transition={FOLLOW}
    padding={{ top: 12, bottom: 12, left: 12, right: 12 }}
  >
    <GaugeTrack width={4} color={INK} opacity={0.12} />
    <GaugeArc from={0} width={4} color={INK} />
    <GaugeMarks values={[0]} length={18} width={2} color={MUTED} />
    <GaugeDot radius={9} color={INK} />
  </LinearGauge>
)

/** Time against the best lap: ahead fills left of centre, behind right. */
const DeltaBar = ({ delta }: { delta: number }) => (
  <LinearGauge
    value={Math.max(-1, Math.min(1, delta))}
    min={-1}
    max={1}
    length={SHORT}
    transition={FOLLOW}
    padding={{ top: 10, bottom: 28, left: 10, right: 10 }}
  >
    <GaugeTrack width={16} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc from={0} width={16} cap="butt" color={INK} />
    <GaugeMarks values={[0]} length={26} width={2} color={INK} />
    <GaugeTickLabels
      count={2}
      offset={-24}
      fontSize={12}
      color={MUTED}
      format={(v) => (v === 0 ? "0" : v < 0 ? "−1.0" : "+1.0")}
    />
  </LinearGauge>
)

/** One tyre's temperature, its working window shaded behind it. The bar
    fades when the tyre is out of the window, cold or overheating. */
const TyreBar = ({ temp, label }: { temp: number; label: string }) => {
  const working = temp >= WINDOW[0] && temp <= WINDOW[1]
  return (
    <div className="flex flex-col items-center gap-1">
      <LinearGauge
        value={temp}
        min={70}
        max={120}
        orientation="vertical"
        length={160}
        transition={FOLLOW}
        padding={{ top: 2, bottom: 2, left: 22, right: 22 }}
        className="h-24"
      >
        <GaugeArc
          from={WINDOW[0]}
          to={WINDOW[1]}
          width={44}
          cap="butt"
          color={INK}
          opacity={0.08}
        />
        <GaugeTrack width={26} cap="butt" color={INK} opacity={0.1} />
        <GaugeArc width={26} cap="butt" color={working ? INK : fade(45)} />
        <GaugeMarks values={[...WINDOW]} length={44} width={2} color={MUTED} />
      </LinearGauge>
      <span className="text-xs font-semibold tabular-nums">
        {Math.round(temp)}°
      </span>
      <Caption>{label}</Caption>
    </div>
  )
}

/** A plain level bar, cut into quarters. */
const LevelBar = ({ value, max }: { value: number; max: number }) => (
  <LinearGauge
    value={value}
    max={max}
    length={SHORT}
    transition={FOLLOW}
    padding={{ top: 8, bottom: 8, left: 4, right: 4 }}
  >
    <GaugeTrack width={14} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc width={14} cap="butt" color={INK} />
    <GaugeMarks count={4} length={14} width={3} color={CUT} />
  </LinearGauge>
)

/** The hybrid either way from idle: harvesting left, deploying right. */
const ErsBar = ({ kw }: { kw: number }) => (
  <LinearGauge
    value={kw}
    min={-ERS_MAX}
    max={ERS_MAX}
    length={SHORT}
    transition={FOLLOW}
    padding={{ top: 8, bottom: 30, left: 4, right: 4 }}
  >
    <GaugeTrack width={14} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc from={0} width={14} cap="butt" color={INK} />
    <GaugeMarks values={[0]} length={24} width={2} color={INK} />
    <GaugeText x={-SHORT / 2} y={24} anchor="start" fontSize={12} color={MUTED}>
      Harvest
    </GaugeText>
    <GaugeText x={SHORT / 2} y={24} anchor="end" fontSize={12} color={MUTED}>
      Deploy
    </GaugeText>
  </LinearGauge>
)

/** The car's place on the lap, with every corner ticked and the sector
    boundaries marked tall. */
const LapPosition = ({ distance }: { distance: number }) => {
  const bounds = [0, ...SECTOR_STARTS, LAP_LENGTH]
  /* Where a distance sits along the bar. */
  const x = (d: number) => (d / LAP_LENGTH - 0.5) * SHORT
  return (
    <LinearGauge
      value={distance}
      max={LAP_LENGTH}
      length={SHORT}
      padding={{ top: 16, bottom: 34, left: 10, right: 10 }}
    >
      <GaugeTrack width={6} color={INK} opacity={0.12} />
      <GaugeArc width={6} color={INK} />
      <GaugeMarks values={CORNERS} length={12} width={2} color={MUTED} />
      <GaugeMarks values={SECTOR_STARTS} length={28} width={2} color={INK} />
      {bounds.slice(0, -1).map((from, i) => (
        <GaugeText
          key={i}
          x={x((from + bounds[i + 1]) / 2)}
          y={26}
          fontSize={12}
          color={MUTED}
        >
          S{i + 1}
        </GaugeText>
      ))}
      <GaugeDot radius={9} halo={3} haloColor={CUT} color={INK} />
    </LinearGauge>
  )
}

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

/* ---------- sections ---------- */

/** The wheel's display: shift lights, pedals, gear and speed, timing. */
const Lap = ({ t }: { t: Telemetry }) => {
  const degrees = t.steer * 180
  return (
    <Panel
      heading={<Category icon={RacingFlagIcon}>Lap {t.lap}</Category>}
      action={`Best ${lapClock(t.bestLap)}`}
      className="sm:col-span-3"
    >
      <ShiftLights rpm={t.rpm} clock={t.clock} />
      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr_13rem] sm:gap-8">
        <div className="flex justify-center gap-3">
          <Pedal value={t.throttle} label="Throttle" color={INK} />
          <Pedal value={t.brake} label="Brake" color={fade(55)} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-end justify-center gap-5">
            <span className="font-rounded text-7xl leading-none font-bold tabular-nums">
              {t.gear}
            </span>
            <div className="flex flex-col pb-1">
              <Figure value={Math.round(t.speed)} unit="km/h" />
              <Caption>{t.rpm.toFixed(1)}k rpm</Caption>
            </div>
          </div>
          <RevTape rpm={t.rpm} />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <Caption>Steering</Caption>
              <Caption>
                {Math.abs(degrees) < 1
                  ? "0°"
                  : `${Math.round(Math.abs(degrees))}° ${degrees < 0 ? "L" : "R"}`}
              </Caption>
            </div>
            <SteeringBar degrees={degrees} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-xs min-w-0 flex-col gap-3">
          <div className="flex flex-col">
            <Caption>Lap time</Caption>
            <Figure value={lapClock(t.lapTime)} className="text-3xl" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <Caption>Delta</Caption>
              <span className="font-rounded text-lg font-bold tabular-nums">
                {gapText(t.delta)}
              </span>
            </div>
            <DeltaBar delta={t.delta} />
          </div>
          <Readouts
            rows={[
              { label: "Last lap", value: lapClock(t.lastLap) },
              { label: "Best lap", value: lapClock(t.bestLap) },
            ]}
          />
        </div>
      </div>
    </Panel>
  )
}

const Tyres = ({ tyres }: { tyres: Telemetry["tyres"] }) => (
  <Panel
    heading={<Category icon={TireIcon}>Tyres</Category>}
    action={`Window ${WINDOW[0]}–${WINDOW[1]}°`}
  >
    <div className="grid grid-cols-2 justify-items-center gap-x-10 gap-y-4 self-center">
      {(["FL", "FR", "RL", "RR"] as const).map((label, i) => (
        <TyreBar key={label} temp={tyres[i]} label={label} />
      ))}
    </div>
  </Panel>
)

const Energy = ({ t }: { t: Telemetry }) => (
  <Panel heading={<Category icon={EnergyIcon}>Energy</Category>} action="ERS">
    {/* Held to a narrow column on a phone, so the bars keep their size. */}
    <div className="mx-auto flex w-full max-w-xs flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <Caption>Battery</Caption>
          <Figure value={Math.round(t.battery)} unit="%" className="text-lg" />
        </div>
        <LevelBar value={t.battery} max={100} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <Caption>Hybrid</Caption>
          <Figure
            value={Math.round(Math.abs(t.ers))}
            unit="kW"
            className="text-lg"
          />
        </div>
        <ErsBar kw={t.ers} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <Caption>Fuel · {Math.floor(t.fuel / FUEL_PER_LAP)} laps</Caption>
          <Figure value={t.fuel.toFixed(1)} unit="kg" className="text-lg" />
        </div>
        <LevelBar value={t.fuel} max={FULL_TANK} />
      </div>
    </div>
  </Panel>
)

/** Each sector's time this lap against the best lap's: done, running or to
    come. */
const Circuit = ({ t }: { t: Telemetry }) => {
  const done = t.sectors.reduce((sum, s) => sum + s, 0)
  return (
    <Panel
      heading={<Category icon={Route01Icon}>Circuit</Category>}
      action={`${(t.distance / 1000).toFixed(2)} / ${(LAP_LENGTH / 1000).toFixed(1)} km`}
    >
      <div className="mx-auto flex w-full max-w-xs flex-col gap-5">
        <LapPosition distance={t.distance} />
        <dl className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 text-xs">
          {[0, 1, 2].map((i) => {
            const time = t.sectors[i]
            const running = i === t.sectors.length
            const best = t.bestSectors[i]
            return (
              <div key={i} className="contents">
                <dt className="text-muted-foreground">S{i + 1}</dt>
                <dd
                  className={cn(
                    "text-right tabular-nums",
                    time === undefined ? "text-muted-foreground" : "font-medium"
                  )}
                >
                  {time !== undefined
                    ? time.toFixed(3)
                    : running
                      ? (t.lapTime - done).toFixed(1)
                      : "—"}
                </dd>
                <dd
                  className={cn(
                    "w-12 text-right tabular-nums",
                    time !== undefined && time < best
                      ? "font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {time !== undefined && best !== undefined
                    ? gapText(time - best)
                    : ""}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </Panel>
  )
}

/**
 * A race car's telemetry on a flying lap: shift lights, pedals, gear,
 * revs and steering, the lap timed against the best one,
 * tyre temperatures against their window, the hybrid and fuel, and the
 * car's place on the circuit sector by sector. A toy car laps a toy circuit, so every bar
 * moves the way it would on a real lap.
 */
export const RaceTelemetry = () => {
  const frame = useRef<HTMLDivElement>(null)
  const t = useLapSimulation(frame)

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-3">
      <Lap t={t} />
      <Tyres tyres={t.tyres} />
      <Energy t={t} />
      <Circuit t={t} />
    </div>
  )
}
