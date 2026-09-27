"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  DashboardSpeed01Icon,
  DropletIcon,
  FavouriteIcon,
  Fire03Icon,
  FootprintsIcon,
  LungsIcon,
  MinusSignIcon,
  Moon02Icon,
  PlusSignIcon,
  PulseIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeInset,
  GaugeMarks,
  GaugeStack,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  clockTime,
  durationLabel,
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
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/** Every gauge sweeps up from the foot of its domain as the tab opens. */
const ARRIVE: GaugeTransition = { type: "spring", visualDuration: 1, bounce: 0 }
/** Soft and without overshoot, for the live heart rate. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.6,
  bounce: 0,
}
/** A glass poured or taken back tops the ring up with a short sweep. */
const POUR: GaugeTransition = {
  type: "spring",
  visualDuration: 0.5,
  bounce: 0.15,
}

const MUTED = "var(--muted-foreground)"
/** Cuts drawn in the card's own colour, to split a band into segments. */
const CUT = "var(--card)"

/** The one ink every mark is drawn in, as the studio templates keep to. */
const INK = "var(--foreground)"

/** The ink thinned towards transparent, for the quieter tones. */
const fade = (percent: number) => fadeColor(INK, percent)

/**
 * The three Activity rings, told apart by weight rather than colour, as the
 * Nested rings template does, so they hold apart in either theme.
 */
const RING_TONE = { move: INK, exercise: fade(62), stand: fade(34) }

/** Every full ring here starts at twelve o'clock and goes round once. */
const ring = { startAngle: 180, endAngle: 540 } as const
/** The top half of a dial, left to right. */
const half = { startAngle: 90, endAngle: 270, fit: "content" } as const

const pad = (n: number) => String(n).padStart(2, "0")

const thousands = (n: number) => Math.round(n).toLocaleString("en-US")

/* ---------- today ---------- */

/** The last full hour of data; the day's charts stop here. */
const NOW_HOUR = 16

type Rings = { move: number; exercise: number; stand: number }

const RINGS = [
  { key: "move", label: "Move", goal: 600, unit: "kcal" },
  { key: "exercise", label: "Exercise", goal: 30, unit: "min" },
  { key: "stand", label: "Stand", goal: 12, unit: "hr" },
] as const

/** Monday to today, a Sunday that is not over yet. */
const WEEK: Rings[] = [
  { move: 612, exercise: 34, stand: 12 },
  { move: 480, exercise: 22, stand: 10 },
  { move: 655, exercise: 41, stand: 12 },
  { move: 390, exercise: 12, stand: 8 },
  { move: 598, exercise: 31, stand: 11 },
  { move: 720, exercise: 58, stand: 12 },
  { move: 420, exercise: 24, stand: 9 },
]
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]
const TODAY = WEEK[WEEK.length - 1]

/** Lowest and highest bpm in each hour so far: asleep, a run at seven, a desk. */
const HEART_HOURS: [number, number][] = [
  [54, 61],
  [52, 58],
  [53, 59],
  [52, 57],
  [54, 60],
  [55, 63],
  [58, 79],
  [92, 148],
  [74, 112],
  [66, 94],
  [64, 88],
  [68, 97],
  [72, 108],
  [66, 90],
  [63, 86],
  [65, 92],
  [64, 84],
]
const HEART_LOW = Math.min(...HEART_HOURS.map(([lo]) => lo))
const HEART_HIGH = Math.max(...HEART_HOURS.map(([, hi]) => hi))
const RESTING = 58

const STEP_GOAL = 10_000
const STEP_HOURS = [
  0, 0, 0, 0, 0, 0, 120, 2140, 860, 310, 240, 520, 1180, 380, 290, 610, 1192,
]
const STEPS = STEP_HOURS.reduce((sum, n) => sum + n, 0)

/** 250 ml a glass, ten to the goal. */
const GLASS = 0.25
const GLASSES = 10

/* ---------- last night ---------- */

type Stage = "awake" | "rem" | "core" | "deep"

/**
 * Top to bottom as the hypnogram stacks them, lightest sleep first. The
 * deeper the sleep, the stronger the tone.
 */
const STAGES: { stage: Stage; label: string; color: string }[] = [
  { stage: "awake", label: "Awake", color: fade(22) },
  { stage: "rem", label: "REM", color: fade(42) },
  { stage: "core", label: "Core", color: fade(68) },
  { stage: "deep", label: "Deep", color: INK },
]
const stageColor = (stage: Stage) =>
  STAGES.find((s) => s.stage === stage)!.color

/** 23:10, in hours from midnight. */
const BEDTIME = -50 / 60

/** The night as it was scored: each stage and how many minutes it lasted. */
const NIGHT: [Stage, number][] = [
  ["core", 20],
  ["deep", 45],
  ["core", 40],
  ["rem", 20],
  ["core", 50],
  ["deep", 30],
  ["core", 35],
  ["rem", 30],
  ["awake", 5],
  ["core", 45],
  ["rem", 35],
  ["core", 25],
  ["awake", 3],
  ["core", 40],
  ["rem", 39],
]

/** The night laid end to end from bedtime, in hours from midnight. */
const SEGMENTS = NIGHT.reduce<{ stage: Stage; from: number; to: number }[]>(
  (acc, [stage, minutes]) => {
    const from = acc.at(-1)?.to ?? BEDTIME
    acc.push({ stage, from, to: from + minutes / 60 })
    return acc
  },
  []
)
const WAKE = SEGMENTS[SEGMENTS.length - 1].to
const IN_BED = WAKE - BEDTIME
const stageHours = (stage: Stage) =>
  SEGMENTS.filter((s) => s.stage === stage).reduce(
    (sum, s) => sum + s.to - s.from,
    0
  )
const ASLEEP = IN_BED - stageHours("awake")

/* ---------- live heart rate ---------- */

/**
 * Drifts the heart rate around a resting-at-a-desk 72 every second and a half
 * while the dashboard is on screen. Reduced motion leaves it where it starts.
 */
const useHeartRate = (visible: boolean) => {
  const [bpm, setBpm] = useState(72)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(
      () =>
        setBpm((b) => {
          const next = b + (72 - b) * 0.2 + (Math.random() * 2 - 1) * 4
          return Math.round(Math.min(86, Math.max(62, next)))
        }),
      1500
    )
    return () => window.clearInterval(id)
  }, [visible])

  return bpm
}

/* ---------- gauges ---------- */

/**
 * The Nested rings template, one tone per ring. Each ring is an inset
 * with its own goal, pulled in by `offset` rather than scaled, so all three
 * keep the same stroke however small the rings are drawn.
 */
const ActivityRings = ({
  day,
  width,
  gap,
}: {
  day: Rings
  width: number
  gap: number
}) => (
  <Gauge value={0} {...ring} padding={width / 2 + 4}>
    {RINGS.map(({ key, goal }, i) => (
      <GaugeInset
        key={key}
        value={day[key]}
        max={goal}
        {...ring}
        transition={ARRIVE}
        initialValue={0}
      >
        <GaugeTrack
          width={width}
          offset={-i * (width + gap)}
          color={INK}
          opacity={0.1}
        />
        <GaugeArc
          width={width}
          offset={-i * (width + gap)}
          color={RING_TONE[key]}
        />
      </GaugeInset>
    ))}
  </Gauge>
)

/**
 * The Heart rate template: a 40–200 bpm sweep over a band of training zones.
 * The arc is today's range rather than a fill, and the dot rides it at the
 * current reading.
 */
const HeartDial = ({ bpm }: { bpm: number }) => (
  <Gauge
    value={bpm}
    min={40}
    max={200}
    startAngle={60}
    endAngle={300}
    padding={24}
    transition={FOLLOW}
    initialValue={40}
  >
    <GaugeTrack width={14} color={INK} opacity={0.14} />
    <GaugeArc
      from={HEART_LOW}
      to={HEART_HIGH}
      width={14}
      color={INK}
      opacity={0.4}
    />
    <GaugeZones
      zones={[
        { to: 100, color: fade(25) },
        { to: 160, color: fade(55) },
        { to: 200, color: INK },
      ]}
      width={4}
      offset={-18}
      gap={1.5}
      endCap="round"
    />
    <GaugeDot radius={11} color={INK} halo={5} haloColor={CUT} />
    <GaugeValue y={-8} fontSize={96} font="rounded" weight="bold" />
    <GaugeText y={58} fontSize={24} font="rounded" weight="bold" color={MUTED}>
      BPM
    </GaugeText>
  </Gauge>
)

/**
 * A twenty-four hour dial with midnight at the top: noon to noon, so a night
 * that crosses midnight is one unbroken arc.
 */
const SleepDial = () => (
  <Gauge
    value={WAKE}
    min={-12}
    max={12}
    startAngle={0}
    endAngle={360}
    padding={20}
    transition={ARRIVE}
    initialValue={BEDTIME}
  >
    <GaugeTrack width={28} color={INK} opacity={0.12} cap="butt" />
    {/* The night's stages, clipped to the animated value so they draw on in
        order from bedtime as the dial sweeps in. */}
    <GaugeStack
      from={BEDTIME}
      width={28}
      parts={SEGMENTS.map(({ stage, to }) => ({
        to,
        color: stageColor(stage),
      }))}
    />
    <GaugeTicks
      count={24}
      length={6}
      width={2}
      offset={-30}
      cap="butt"
      color={MUTED}
      opacity={0.5}
    />
    <GaugeTickLabels
      count={4}
      offset={-56}
      fontSize={22}
      weight="semibold"
      color={MUTED}
      format={(v) => pad((v + 24) % 24)}
    />
    <GaugeText y={-8} fontSize={56} font="rounded" weight="bold">
      {durationLabel(ASLEEP)}
    </GaugeText>
    <GaugeText y={40} fontSize={22} color={MUTED}>
      asleep
    </GaugeText>
  </Gauge>
)

/** Steps on a half dial that fills to the day's goal, a tick a thousand. */
const StepsDial = () => (
  <Gauge
    value={STEPS}
    max={STEP_GOAL}
    {...half}
    padding={24}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={32} color={INK} opacity={0.16} />
    <GaugeArc width={32} color={INK} />
    <GaugeTicks
      count={10}
      length={8}
      width={2.5}
      offset={-34}
      color={MUTED}
      opacity={0.4}
    />
    <GaugeValue
      y={-58}
      fontSize={72}
      font="rounded"
      weight="bold"
      format={thousands}
    />
    <GaugeText y={-6} fontSize={22} color={MUTED}>
      {`of ${thousands(STEP_GOAL)} steps`}
    </GaugeText>
  </Gauge>
)

/** A ring cut into one segment per glass, filling as they are logged. */
const WaterDial = ({ glasses }: { glasses: number }) => (
  <Gauge
    value={glasses}
    max={GLASSES}
    {...ring}
    padding={20}
    transition={POUR}
    initialValue={0}
  >
    <GaugeTrack width={34} color={INK} opacity={0.16} cap="butt" />
    <GaugeArc width={34} color={INK} cap="butt" />
    <GaugeMarks count={GLASSES} length={38} width={6} cap="butt" color={CUT} />
    <GaugeText y={-8} fontSize={60} font="rounded" weight="bold">
      {`${(glasses * GLASS).toFixed(2)} L`}
    </GaugeText>
    <GaugeText y={40} fontSize={22} color={MUTED}>
      {`of ${GLASSES * GLASS} L`}
    </GaugeText>
  </Gauge>
)

/**
 * The small half dial on the vitals tiles: the whole scale as a track, the
 * normal range picked out on it, and a dot at the reading, ringed in the
 * card's colour so it stands off the band.
 */
const RangeDial = ({
  value,
  min,
  max,
  range: [lo, hi],
}: {
  value: number
  min: number
  max: number
  range: [number, number]
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
    <GaugeTrack width={36} color={INK} opacity={0.16} />
    <GaugeArc
      from={lo}
      to={hi}
      width={36}
      color={INK}
      opacity={0.45}
      cap="butt"
    />
    <GaugeDot radius={20} color={INK} halo={10} haloColor={CUT} />
  </Gauge>
)

/* ---------- charts ---------- */

/** One column per hour of the day, with a clock under every sixth. */
const Hours = ({ children }: { children: (hour: number) => ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="grid h-14 grid-cols-24 gap-0.5">
      {Array.from({ length: 24 }, (_, hour) => (
        <div key={hour} className="relative">
          {children(hour)}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-4 text-[10px] text-muted-foreground tabular-nums">
      {[0, 6, 12, 18].map((hour) => (
        <span key={hour}>{pad(hour)}</span>
      ))}
    </div>
  </div>
)

/** Where a value sits between `lo` and `hi`, as a percentage. */
const share = (value: number, lo: number, hi: number) =>
  `${((value - lo) / (hi - lo)) * 100}%`

/** Each hour's lowest to highest bpm, as the Health app's range chart. */
const HeartRange = () => (
  <Hours>
    {(hour) => {
      const range = HEART_HOURS[hour]
      if (!range) return null
      return (
        <div
          className="absolute inset-x-0 mx-auto w-1.5 max-w-full rounded-full"
          style={{
            bottom: share(range[0], 40, 160),
            top: `calc(100% - ${share(range[1], 40, 160)})`,
            background: INK,
          }}
        />
      )
    }}
  </Hours>
)

const STEP_PEAK = Math.max(...STEP_HOURS)

/** Steps taken in each hour, a faint dot for an hour spent still. */
const StepBars = () => (
  <Hours>
    {(hour) => {
      const steps = STEP_HOURS[hour]
      if (steps === undefined) return null
      return (
        <div
          className="absolute inset-x-0 bottom-0 mx-auto w-1.5 max-w-full rounded-full"
          style={
            steps > 0
              ? { height: share(steps, 0, STEP_PEAK), background: INK }
              : { height: 6, background: fade(25) }
          }
        />
      )
    }}
  </Hours>
)

/** The night stage by stage, one lane each, lightest sleep on top. */
const Hypnogram = () => (
  <div className="flex flex-col gap-1.5">
    <div className="relative h-14">
      {SEGMENTS.map(({ stage, from, to }, i) => {
        const lane = STAGES.findIndex((s) => s.stage === stage)
        return (
          <div
            key={i}
            className="absolute h-[calc(25%-3px)] rounded-[3px]"
            style={{
              left: share(from, BEDTIME, WAKE),
              width: `max(2px, ${((to - from) / IN_BED) * 100}%)`,
              top: `${lane * 25}%`,
              background: stageColor(stage),
            }}
          />
        )
      })}
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
      <span>{clockTime(BEDTIME)}</span>
      <span>{clockTime(WAKE)}</span>
    </div>
  </div>
)

/* ---------- layout ---------- */

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

/** A reading the way Health sets it: a bold rounded figure, a small unit. */
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

/** A category heading, its icon in the muted tone, as each Health section has. */
const Category = ({
  icon,
  children,
  iconClassName,
  iconStyle,
}: {
  icon: IconSvgElement
  children: ReactNode
  iconClassName?: string
  iconStyle?: CSSProperties
}) => (
  <span className="flex items-center gap-1.5 text-sm font-semibold">
    <HugeiconsIcon
      icon={icon}
      strokeWidth={2}
      className={cn("size-4 text-muted-foreground", iconClassName)}
      style={iconStyle}
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

/** A swatch in one of the dial's tones. */
const Swatch = ({ color }: { color: string }) => (
  <span
    className="size-2 shrink-0 rounded-full"
    style={{ background: color }}
  />
)

type Row = { label: string; value: ReactNode; swatch?: string }

const Readouts = ({ rows }: { rows: Row[] }) => (
  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
    {rows.map(({ label, value, swatch }) => (
      <div key={label} className="contents">
        <dt className="flex items-center gap-2 text-muted-foreground">
          {swatch && <Swatch color={swatch} />}
          {label}
        </dt>
        <dd className="text-right font-medium tabular-nums">{value}</dd>
      </div>
    ))}
  </dl>
)

/** A vitals tile: the category, the figure, a small dial and its range. */
const Vital = ({
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
  unit: string
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

/* ---------- sections ---------- */

const Activity = () => (
  <Panel
    heading={<Category icon={Fire03Icon}>Activity</Category>}
    action="Today"
    className="sm:col-span-2"
  >
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-center">
      <div className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-6">
        <ActivityRings day={TODAY} width={44} gap={6} />
        <dl className="flex flex-col gap-3">
          {RINGS.map(({ key, label, goal, unit }) => (
            <div key={key} className="flex flex-col">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Swatch color={RING_TONE[key]} />
                {label}
              </dt>
              <dd>
                <Figure
                  value={`${TODAY[key]}/${goal}`}
                  unit={unit}
                  className="text-xl"
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-3 border-t pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
        <span className="text-xs text-muted-foreground">This week</span>
        <div className="grid grid-cols-7 gap-2">
          {WEEK.map((day, i) => {
            const today = i === WEEK.length - 1
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <ActivityRings day={day} width={56} gap={8} />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    today ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {WEEKDAYS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  </Panel>
)

const HeartRate = ({ bpm }: { bpm: number }) => (
  <Panel
    heading={
      <Category
        icon={FavouriteIcon}
        iconStyle={{ "--beat": `${60 / bpm}s` } as CSSProperties}
      >
        Heart rate
      </Category>
    }
    action="Now"
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <HeartDial bpm={bpm} />
      <Readouts
        rows={[
          { label: "Resting", value: `${RESTING} bpm` },
          { label: "Walking avg", value: "94 bpm" },
          { label: "Range", value: `${HEART_LOW}–${HEART_HIGH}` },
          {
            label: "Zone",
            value: bpm < 100 ? "Rest" : bpm < 160 ? "Cardio" : "Peak",
          },
        ]}
      />
    </div>
    <HeartRange />
  </Panel>
)

const Sleep = () => (
  <Panel
    heading={<Category icon={Moon02Icon}>Sleep</Category>}
    action={`${clockTime(BEDTIME)} – ${clockTime(WAKE)}`}
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <SleepDial />
      <Readouts
        rows={[
          ...STAGES.map(({ stage, label, color }) => ({
            label,
            value: durationLabel(stageHours(stage)),
            swatch: color,
          })),
          { label: "In bed", value: durationLabel(IN_BED) },
        ]}
      />
    </div>
    <Hypnogram />
  </Panel>
)

const Steps = () => (
  <Panel
    heading={<Category icon={FootprintsIcon}>Steps</Category>}
    action={`${pad(NOW_HOUR)}:40`}
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <StepsDial />
      <Readouts
        rows={[
          { label: "Distance", value: "5.6 km" },
          { label: "Flights", value: "9 floors" },
          { label: "To goal", value: thousands(STEP_GOAL - STEPS) },
          { label: "Daily avg", value: "8,910" },
        ]}
      />
    </div>
    <StepBars />
  </Panel>
)

const Water = () => {
  const [glasses, setGlasses] = useState(7)
  const [last, setLast] = useState("14:20")

  const pour = (by: number) => {
    setGlasses((g) => Math.min(GLASSES * 2, Math.max(0, g + by)))
    if (by > 0) setLast("Just now")
  }

  return (
    <Panel
      heading={<Category icon={DropletIcon}>Water</Category>}
      action={`${glasses} of ${GLASSES} glasses`}
    >
      <div className="grid grid-cols-2 items-center gap-6">
        <WaterDial glasses={glasses} />
        <div className="flex flex-col gap-4">
          <Readouts
            rows={[
              {
                label: "Remaining",
                value: `${(Math.max(0, GLASSES - glasses) * GLASS).toFixed(2)} L`,
              },
              { label: "Glass", value: `${GLASS * 1000} ml` },
              { label: "Last", value: last },
            ]}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => pour(-1)}
              disabled={glasses === 0}
              aria-label="Remove a glass"
            >
              <HugeiconsIcon icon={MinusSignIcon} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => pour(1)}
              aria-label="Add a glass"
            >
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              {GLASS * 1000} ml
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  )
}

const Vitals = () => (
  <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
    <Vital
      icon={LungsIcon}
      label="Blood oxygen"
      value="98"
      unit="%"
      caption="Normal 95–100%"
    >
      <RangeDial value={98} min={80} max={100} range={[95, 100]} />
    </Vital>
    <Vital
      icon={LungsIcon}
      label="Respiratory rate"
      value="14.5"
      unit="br/min"
      caption="Normal 12–20"
    >
      <RangeDial value={14.5} min={8} max={24} range={[12, 20]} />
    </Vital>
    <Vital
      icon={PulseIcon}
      label="Heart rate variability"
      value="52"
      unit="ms"
      caption="Your range 38–64 ms"
    >
      <RangeDial value={52} min={0} max={120} range={[38, 64]} />
    </Vital>
    <Vital
      icon={DashboardSpeed01Icon}
      label="Cardio fitness"
      value="42.3"
      unit="VO₂"
      caption="VO₂ max, above average"
    >
      <RangeDial value={42.3} min={25} max={60} range={[39, 46]} />
    </Vital>
  </div>
)

/**
 * A day in the Health app, on gauges: the Activity rings with the week beside
 * them, heart rate on the Heart rate template with the day's range under it,
 * last night's sleep round a twenty-four hour dial, steps and water filling
 * to their goals, and a row of vitals, each a dot on its normal range.
 */
export const HealthDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const bpm = useHeartRate(useInView(frame))

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Activity />
      <HeartRate bpm={bpm} />
      <Sleep />
      <Steps />
      <Water />
      <Vitals />
    </div>
  )
}
