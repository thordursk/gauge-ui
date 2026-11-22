"use client"

import { useRef, useState, type PointerEvent, type ReactNode } from "react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeDots,
  GaugeInset,
  GaugeMarks,
  GaugeText,
  GaugeTickLabels,
  GaugeTooltip,
  GaugeTrack,
  GaugeValue,
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
  BOOSTER_ENGINES,
  BURN_ENGINES,
  COUNT,
  END,
  EVENTS,
  LANDING_RESERVE,
  SEPARATION,
  phaseOf,
  useLaunchSimulation,
  type Launch,
  type StageReadings,
} from "./launch-simulation"

const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.15,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"
const CUT = "var(--background)"
const INK = "var(--foreground)"
const fade = (percent: number) => fadeColor(INK, percent)

const SHORT = 240
const HALF = 380

const SPEED_MAX = 30000
const ALTITUDE_MAX = 250
const G_MAX = 6
const Q_MAX = 25

const SECO = EVENTS.find((e) => e.name === "SECO")?.t ?? END

const pad = (n: number) => String(n).padStart(2, "0")

const missionClock = (t: number) => {
  const s = t < 0 ? Math.ceil(-t) : Math.floor(t)
  return `T${t < 0 ? "−" : "+"}${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

const span = (seconds: number) => {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

const grouped = (v: number) => Math.round(v).toLocaleString("en-US")

const Readout = ({
  value,
  max,
  unit,
  format,
}: {
  value: number
  max: number
  unit: string
  format: (value: number) => string
}) => (
  <Gauge value={value} max={max} transition={FOLLOW} padding={12}>
    <GaugeTrack width={10} color={INK} opacity={0.12} />
    <GaugeArc width={10} color={INK} />
    <GaugeValue
      y={-8}
      fontSize={80}
      font="rounded"
      weight="bold"
      format={format}
    />
    <GaugeText y={66} fontSize={34} weight="semibold" color={MUTED}>
      {unit}
    </GaugeText>
  </Gauge>
)

const ENGINE = 34

type EngineLayout = (ring: number) => boolean

const EngineFlower = ({
  ring,
  lit,
  centreLit,
  throttle,
  fuel,
  centreSize = ENGINE,
}: {
  ring: number
  lit: EngineLayout
  centreLit: boolean
  throttle: number
  fuel: number
  centreSize?: number
}) => {
  const glow = fade(35 + 65 * throttle)
  const dark = fade(12)
  const spacing = 360 / Math.max(ring, 1)
  return (
    <Gauge value={fuel * 100} transition={FOLLOW} padding={12}>
      <GaugeTrack width={10} color={INK} opacity={0.12} />
      <GaugeArc width={10} color={INK} />
      <GaugeInset
        value={0}
        max={Math.max(ring, 1)}
        startAngle={180 + spacing / 2}
        endAngle={540 + spacing / 2}
        scale={0.85}
      >
        {ring > 0 && (
          <GaugeDots
            count={ring}
            offset={-82}
            radius={ENGINE}
            color={(v) => (lit(Math.round(v)) ? glow : dark)}
          />
        )}
        <GaugeDot
          offset={-200}
          radius={centreSize}
          color={centreLit ? glow : dark}
        />
      </GaugeInset>
    </Gauge>
  )
}

const RING = BOOSTER_ENGINES - 1
const LANDING_THREE = [0, RING / 2]

const boosterLayout =
  (engines: number, t: number): EngineLayout =>
  (i) =>
    engines >= BOOSTER_ENGINES ||
    (t >= SEPARATION && engines === BURN_ENGINES
      ? LANDING_THREE.includes(i)
      : i < engines - 1)

const FULL = 900
const TIMELINE_PAD = 4

const eventTime = (name: string) => EVENTS.find((e) => e.name === name)?.t ?? 0

const BAR = 8
const SECTION_GAP = 3

const SECTIONS = [
  { name: "Count", from: COUNT, to: 0 },
  { name: "Stage 1 burn", from: 0, to: eventTime("MECO") },
  { name: "Staging", from: eventTime("MECO"), to: eventTime("SES") },
  { name: "Stage 2 burn", from: eventTime("SES"), to: SECO },
  { name: "Orbit", from: SECO, to: END },
]

const AHEAD = fade(20)

const ALIGN: Record<string, "start" | "end"> = {
  Liftoff: "start",
  MECO: "end",
  SES: "start",
  Fairing: "start",
  Boostback: "start",
}

const Timeline = ({ t }: { t: number }) => {
  const [hover, setHover] = useState<number | null>(null)
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const at = COUNT + (p.x / FULL + 0.5) * (END - COUNT)
    setHover(at >= COUNT && at <= END ? at : null)
  }
  const section =
    hover === null
      ? null
      : (SECTIONS.find((s) => hover >= s.from && hover < s.to) ?? null)

  return (
    <LinearGauge
      value={t}
      min={COUNT}
      max={END}
      length={FULL}
      transition={FOLLOW}
      padding={{ top: 20, bottom: 20, left: TIMELINE_PAD, right: TIMELINE_PAD }}
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={() => setHover(null)}
    >
      <GaugeTrack width={BAR} cap="butt" color={INK} opacity={0.12} />
      <GaugeArc width={BAR} cap="butt" color={INK} />
      {section && (
        <GaugeArc
          from={section.from}
          to={section.to}
          width={BAR}
          cap="butt"
          color={INK}
          opacity={0.15}
        />
      )}
      <GaugeMarks
        values={SECTIONS.slice(1).map((s) => s.from)}
        length={BAR}
        width={SECTION_GAP}
        cap="butt"
        color={CUT}
      />
      <GaugeMarks
        values={EVENTS.filter((e) => !e.booster).map((e) => e.t)}
        offset={BAR / 2 + 8}
        length={10}
        width={2}
        color={(v) => (v <= t ? INK : AHEAD)}
      />
      <GaugeMarks
        values={EVENTS.filter((e) => e.booster).map((e) => e.t)}
        offset={-(BAR / 2 + 8)}
        length={10}
        width={2}
        color={(v) => (v <= t ? INK : AHEAD)}
      />
      {section && (
        <GaugeTooltip
          at={(section.from + section.to) / 2}
          offset={BAR / 2}
          open
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="opacity-70">
              {section.to <= t
                ? "Done"
                : section.from <= t
                  ? "Under way"
                  : "To come"}
            </span>
            <span className="text-sm font-semibold">{section.name}</span>
            <span className="tabular-nums opacity-70">
              {missionClock(section.from)} – {missionClock(section.to)}
            </span>
          </div>
        </GaugeTooltip>
      )}
    </LinearGauge>
  )
}

const ThrottleBar = ({ value }: { value: number }) => (
  <LinearGauge
    value={value * 100}
    length={SHORT}
    transition={FOLLOW}
    padding={{ top: 8, bottom: 8, left: 2, right: 2 }}
  >
    <GaugeTrack width={14} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc width={14} cap="butt" color={INK} />
    <GaugeMarks count={4} length={14} width={3} color={CUT} />
  </LinearGauge>
)

const PressureBar = ({ q, peak }: { q: number; peak: number }) => (
  <LinearGauge
    value={q}
    max={Q_MAX}
    length={HALF}
    padding={{ top: 20, bottom: 34, left: 10, right: 10 }}
  >
    <GaugeTrack width={18} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc width={18} cap="butt" color={INK} />
    {peak > 0 && (
      <GaugeMarks values={[peak]} length={26} width={2} color={MUTED} />
    )}
    <GaugeTickLabels count={5} offset={-28} fontSize={12} color={MUTED} />
  </LinearGauge>
)

const Tank = ({
  level,
  label,
  reserve,
}: {
  level: number
  label: string
  reserve?: number
}) => (
  <div className="flex flex-col items-center gap-1">
    <LinearGauge
      value={level * 100}
      orientation="vertical"
      length={160}
      transition={FOLLOW}
      padding={{ top: 2, bottom: 2, left: 22, right: 22 }}
      className="h-32"
    >
      {reserve !== undefined && (
        <GaugeArc
          to={reserve * 100}
          width={44}
          cap="butt"
          color={INK}
          opacity={0.2}
        />
      )}
      <GaugeTrack width={26} cap="butt" color={INK} opacity={0.1} />
      <GaugeArc width={26} cap="butt" color={INK} />
      <GaugeMarks count={4} length={26} width={3} color={CUT} />
      {reserve !== undefined && (
        <GaugeMarks
          values={[reserve * 100]}
          length={44}
          width={3}
          color={MUTED}
        />
      )}
    </LinearGauge>
    <span className="text-xs font-semibold tabular-nums">
      {Math.round(level * 100)}%
    </span>
    <Caption>{label}</Caption>
  </div>
)

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

const Figure = ({
  value,
  className,
}: {
  value: ReactNode
  className?: string
}) => (
  <span
    className={cn(
      "font-rounded text-2xl font-bold tracking-tight tabular-nums",
      className
    )}
  >
    {value}
  </span>
)

const Panel = ({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <Card size="sm" className={cn("shadow-none", className)}>
    <CardHeader>
      <CardTitle className="text-sm">{title}</CardTitle>
      {action && (
        <CardAction className="text-xs text-muted-foreground tabular-nums">
          {action}
        </CardAction>
      )}
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-center gap-4">
      {children}
    </CardContent>
  </Card>
)

const Row = ({
  label,
  value,
  children,
}: {
  label: ReactNode
  value: ReactNode
  children: ReactNode
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium">{label}</span>
      <Caption>{value}</Caption>
    </div>
    {children}
  </div>
)

const Labelled = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex min-w-0 flex-col items-center gap-1">
    <div className="w-full max-w-24">{children}</div>
    <span className="text-[10px] font-semibold tracking-widest whitespace-nowrap text-muted-foreground uppercase">
      {label}
    </span>
  </div>
)

const along = (t: number) =>
  `${((TIMELINE_PAD + ((t - COUNT) / (END - COUNT)) * FULL) / (FULL + TIMELINE_PAD * 2)) * 100}%`

const EventLabels = ({ t, booster }: { t: number; booster: boolean }) => (
  <div className="relative hidden h-4 sm:block">
    {EVENTS.filter((e) => Boolean(e.booster) === booster).map((e) => (
      <span
        key={e.name}
        className={cn(
          "absolute text-xs whitespace-nowrap",
          ALIGN[e.name] === "start"
            ? ""
            : ALIGN[e.name] === "end"
              ? "-translate-x-full"
              : "-translate-x-1/2",
          e.t <= t ? "font-medium" : "text-muted-foreground/50"
        )}
        style={{ left: along(e.t) }}
      >
        {e.name}
      </span>
    ))}
  </div>
)

const Mission = ({ launch }: { launch: Launch }) => {
  const { t } = launch
  const next = EVENTS.find((e) => e.t > t)
  return (
    <Panel title="Mission" className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <Figure value={missionClock(t)} className="text-4xl" />
          <Caption>{phaseOf(t)}</Caption>
        </div>
        <div className="flex flex-col items-end">
          <Figure
            value={next ? span(next.t - t) : "Nominal"}
            className="text-lg"
          />
          <Caption>
            {next
              ? `to ${next.name}${next.booster ? " (booster)" : ""}`
              : "Next launch shortly"}
          </Caption>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <EventLabels t={t} booster={false} />
        <Timeline t={t} />
        <EventLabels t={t} booster />
      </div>
    </Panel>
  )
}

const Stage = ({
  title,
  status,
  stage,
  engines,
}: {
  title: string
  status: string
  stage: StageReadings
  engines: ReactNode
}) => (
  <Panel title={title} action={status}>
    <div className="grid grid-cols-4 items-start gap-2">
      <Labelled label="Speed">
        <Readout
          value={stage.speed * 3.6}
          max={SPEED_MAX}
          unit="KM/H"
          format={grouped}
        />
      </Labelled>
      <Labelled label="Altitude">
        <Readout
          value={stage.altitude}
          max={ALTITUDE_MAX}
          unit="KM"
          format={(v) => (v < 10 ? v.toFixed(1) : String(Math.round(v)))}
        />
      </Labelled>
      <Labelled label="G-force">
        <Readout
          value={stage.accel}
          max={G_MAX}
          unit="G"
          format={(v) => v.toFixed(1)}
        />
      </Labelled>
      <Labelled label="Fuel">{engines}</Labelled>
    </div>
  </Panel>
)

const Propulsion = ({ launch }: { launch: Launch }) => {
  const { booster, stageTwo } = launch
  return (
    <Panel title="Propulsion">
      <Row
        label="Booster throttle"
        value={`${Math.round(booster.throttle * 100)}%`}
      >
        <ThrottleBar value={booster.throttle} />
      </Row>
      <Row
        label="Second stage throttle"
        value={
          stageTwo.engines > 0
            ? `${Math.round(stageTwo.throttle * 100)}%`
            : launch.t >= SECO
              ? "Shut down"
              : "Waiting"
        }
      >
        <ThrottleBar value={stageTwo.throttle} />
      </Row>
      <Row
        label="Dynamic pressure"
        value={`${launch.q.toFixed(1)} kPa · max-Q ${launch.peakQ.toFixed(1)}`}
      >
        <PressureBar q={launch.q} peak={launch.peakQ} />
      </Row>
    </Panel>
  )
}

const Propellant = ({ launch }: { launch: Launch }) => (
  <Panel title="Propellant">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <Tank
            level={launch.booster.lox}
            label="LOX"
            reserve={LANDING_RESERVE}
          />
          <Tank
            level={launch.booster.fuel}
            label="RP-1"
            reserve={LANDING_RESERVE}
          />
        </div>
        <span className="text-xs font-medium">Stage 1</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <Tank level={launch.stageTwo.lox} label="LOX" />
          <Tank level={launch.stageTwo.fuel} label="RP-1" />
        </div>
        <span className="text-xs font-medium">Stage 2</span>
      </div>
    </div>
  </Panel>
)

export const RocketLaunch = () => {
  const frame = useRef<HTMLDivElement>(null)
  const launch = useLaunchSimulation(frame)
  const { t, booster, stageTwo } = launch

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Mission launch={launch} />
      <Stage
        title="Stage 1"
        status={launch.boosterStatus}
        stage={booster}
        engines={
          <EngineFlower
            ring={RING}
            lit={boosterLayout(booster.engines, t)}
            centreLit={booster.engines > 0}
            throttle={booster.throttle}
            fuel={booster.fuel}
          />
        }
      />
      <Stage
        title="Stage 2"
        status={
          stageTwo.engines > 0
            ? "Burning"
            : t >= SECO
              ? "In orbit"
              : t >= SEPARATION
                ? "Separated"
                : "Attached"
        }
        stage={stageTwo}
        engines={
          <EngineFlower
            ring={0}
            lit={() => false}
            centreLit={stageTwo.engines > 0}
            throttle={stageTwo.throttle}
            fuel={stageTwo.fuel}
            centreSize={110}
          />
        }
      />
      <Propulsion launch={launch} />
      <Propellant launch={launch} />
    </div>
  )
}
