"use client"

import { useRef, type ReactNode } from "react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeMarks,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  COUNT,
  END,
  EVENTS,
  LANDING_RESERVE,
  SEPARATION,
  WARP,
  phaseOf,
  useLaunchSimulation,
  type Launch,
  type StageReadings,
} from "./launch-simulation"

/** Quick and without overshoot, so twenty readings a second glide together. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.15,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"
/** Drawn in the card's own colour, to cut a band into segments. */
const CUT = "var(--card)"
/** The one ink every mark is drawn in, thinned for the quieter tones. */
const INK = "var(--foreground)"
const fade = (percent: number) => fadeColor(INK, percent)

/** Bar lengths in SVG units, near the width each column draws them at. */
const SHORT = 240
const FULL = 900

/** The dials' full scales, shared by both stages so they compare. */
const SPEED_MAX = 30000
const ALTITUDE_MAX = 250
const G_MAX = 6
const Q_MAX = 25

/** When the second stage reaches orbit and shuts down. */
const SECO = EVENTS.find((e) => e.name === "SECO")?.t ?? END

const pad = (n: number) => String(n).padStart(2, "0")

/** Mission time as the clock shows it: "T−00:07" in the count, "T+02:31"
    after. The count rounds up, so it reads T−00:01 until liftoff. */
const missionClock = (t: number) => {
  const s = t < 0 ? Math.ceil(-t) : Math.floor(t)
  return `T${t < 0 ? "−" : "+"}${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

/** A span of seconds as "6:02". */
const span = (seconds: number) => {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/** Grouped by thousands the same way on the server and in every browser. */
const grouped = (v: number) => Math.round(v).toLocaleString("en-US")

/* ---------- dials ---------- */

/**
 * A stage's reading as a webcast shows it: a thin ring filling round the
 * figure, its unit under it, and nothing else.
 */
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

/** Radius of one booster engine on the flower: the centre one and the
    eight round it are alike. */
const ENGINE = 34

/** Ring engines lit for a burn, around the centre one. */
type EngineLayout = (ring: number) => boolean

/**
 * A stage's engines from below, as a flower: the centre engine and a ring
 * of others round it, in a ring for the stage's base. Each glows in
 * proportion to its throttle while it burns. Drawn on a full-circle gauge,
 * the ring is its ticks with no length, so each is a round dot.
 */
const EngineFlower = ({
  ring,
  lit,
  centreLit,
  throttle,
  centreSize = ENGINE,
}: {
  /** Engines in the ring round the centre one. */
  ring: number
  lit: EngineLayout
  centreLit: boolean
  throttle: number
  centreSize?: number
}) => {
  const glow = fade(35 + 65 * throttle)
  const dark = fade(12)
  return (
    <Gauge
      value={0}
      max={Math.max(ring, 1)}
      startAngle={180}
      endAngle={540}
      padding={12}
    >
      <GaugeTrack width={4} offset={-30} color={INK} opacity={0.25} />
      {ring > 0 && (
        <GaugeTicks
          count={ring}
          offset={-82}
          length={0}
          width={ENGINE * 2}
          color={(v) => (lit(Math.round(v)) ? glow : dark)}
        />
      )}
      <GaugeDot
        offset={-200}
        radius={centreSize}
        color={centreLit ? glow : dark}
      />
    </Gauge>
  )
}

/**
 * Which of the booster's eight ring engines burn for a count of engines lit.
 * They come on in turn round the ring as it lights for liftoff; flying home
 * it lights the centre with two opposite each other, or the centre alone.
 */
const boosterLayout =
  (engines: number, t: number): EngineLayout =>
  (i) =>
    engines >= 9 ||
    (t >= SEPARATION && engines === 3 ? i === 0 || i === 4 : i < engines - 1)

/* ---------- bars ---------- */

/**
 * The mission from the count to orbit, filling as it flies. Marks above the
 * line are the second stage's events and those below the booster's on its
 * way home; each darkens once it has happened.
 */
const Timeline = ({ t }: { t: number }) => (
  <LinearGauge
    value={t}
    min={COUNT}
    max={END}
    length={FULL}
    transition={FOLLOW}
    padding={{ top: 18, bottom: 18, left: 10, right: 10 }}
  >
    <GaugeTrack width={6} color={INK} opacity={0.12} />
    <GaugeArc width={6} color={INK} />
    <GaugeMarks
      values={EVENTS.filter((e) => !e.booster).map((e) => e.t)}
      offset={9}
      length={14}
      width={2}
      color={(v) => (v <= t ? INK : MUTED)}
    />
    <GaugeMarks
      values={EVENTS.filter((e) => e.booster).map((e) => e.t)}
      offset={-9}
      length={14}
      width={2}
      color={(v) => (v <= t ? INK : MUTED)}
    />
    <GaugeDot radius={8} halo={3} haloColor={CUT} color={INK} />
    <GaugeTooltip label={phaseOf(t)} format={missionClock} />
  </LinearGauge>
)

/** A throttle, cut into quarters. */
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

/** The air pushing on the stack, with its scale under it and the highest
    it has reached marked over it. */
const PressureBar = ({ q, peak }: { q: number; peak: number }) => (
  <LinearGauge
    value={q}
    max={Q_MAX}
    length={SHORT}
    transition={FOLLOW}
    padding={{ top: 14, bottom: 30, left: 10, right: 10 }}
  >
    <GaugeTrack width={12} cap="butt" color={INK} opacity={0.1} />
    <GaugeArc width={12} cap="butt" color={INK} />
    {peak > 0 && (
      <GaugeMarks values={[peak]} length={28} width={2} color={MUTED} />
    )}
    <GaugeTickLabels count={5} offset={-24} fontSize={12} color={MUTED} />
  </LinearGauge>
)

/**
 * A propellant tank draining as a column, cut into quarters. The booster's
 * keep a reserve for flying home, shaded at the foot with its line across.
 */
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
          opacity={0.08}
        />
      )}
      <GaugeTrack width={26} cap="butt" color={INK} opacity={0.1} />
      <GaugeArc width={26} cap="butt" color={INK} />
      <GaugeMarks count={4} length={26} width={3} color={CUT} />
      {reserve !== undefined && (
        <GaugeMarks
          values={[reserve * 100]}
          length={44}
          width={2}
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

/* ---------- layout ---------- */

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

/** A reading set as a bold rounded figure. */
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
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <Card size="sm" className={cn("shadow-none", className)}>
    <CardHeader>
      <CardTitle className="text-sm">{title}</CardTitle>
      {description && (
        <CardDescription className="text-xs">{description}</CardDescription>
      )}
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

/** A label over a reading on the right, above the bar it belongs to. */
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

/** A dial with its name in small capitals under it. */
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

/** Text placed along the timeline by percentage, so it lines up with the
    SVG however wide the card draws it. */
const along = (t: number) => {
  const pad = 10
  return `${((pad + ((t - COUNT) / (END - COUNT)) * FULL) / (FULL + pad * 2)) * 100}%`
}

/** Which edge of an event's name sits at its mark, where names crowd. */
const ALIGN: Record<string, "start" | "end"> = {
  Liftoff: "start",
  MECO: "end",
  SES: "start",
  Fairing: "start",
  Boostback: "start",
}

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
          e.t <= t ? "font-medium" : "text-muted-foreground"
        )}
        style={{ left: along(e.t) }}
      >
        {e.name}
      </span>
    ))}
  </div>
)

/* ---------- sections ---------- */

const Mission = ({ launch }: { launch: Launch }) => {
  const { t } = launch
  const next = EVENTS.find((e) => e.t > t)
  return (
    <Panel
      title="Mission"
      description="Two stages to a 200 km orbit, the booster flying home"
      action={t < 0 ? "Real time" : `×${WARP}`}
      className="sm:col-span-2"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <Figure value={missionClock(t)} className="text-4xl" />
          <Caption>{phaseOf(t)}</Caption>
        </div>
        <div className="flex flex-col items-end">
          {next ? (
            <>
              <Figure value={span(next.t - t)} className="text-lg" />
              <Caption>
                to {next.name}
                {next.booster && " (booster)"}
              </Caption>
            </>
          ) : (
            <>
              <Figure value="Nominal" className="text-lg" />
              <Caption>Next launch shortly</Caption>
            </>
          )}
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

/**
 * One stage's telemetry as the webcast lays it out: speed, altitude and
 * g-force on rings, and its engines from below.
 */
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
      <Labelled label={`Engines ${stage.engines}`}>{engines}</Labelled>
    </div>
  </Panel>
)

const Propulsion = ({ launch }: { launch: Launch }) => {
  const { booster, stageTwo } = launch
  return (
    <Panel title="Propulsion" description="Throttles and the air on the stack">
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
  <Panel title="Propellant" description="Left in each tank">
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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-0.5 w-3 shrink-0 rounded-full bg-muted-foreground" />
      Landing reserve
    </div>
  </Panel>
)

/**
 * A rocket launch from the last seconds of the count to orbit, laid out
 * like a launch webcast: the mission clock over a timeline of its events,
 * then each stage's speed, altitude and g-force on thin rings beside its
 * engines from below, lighting as they burn. The two stages read alike
 * until they part, then the second stage climbs on to orbit while the
 * booster turns back and lands. Throttles, the air on the stack and the
 * tanks stay on bars.
 */
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
            ring={8}
            lit={boosterLayout(booster.engines, t)}
            centreLit={booster.engines > 0}
            throttle={booster.throttle}
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
            centreSize={120}
          />
        }
      />
      <Propulsion launch={launch} />
      <Propellant launch={launch} />
    </div>
  )
}
