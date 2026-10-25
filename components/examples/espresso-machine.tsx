"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

import {
  Gauge,
  GaugeArc,
  GaugeControl,
  GaugeDot,
  GaugeHub,
  GaugeMarks,
  GaugeNeedle,
  GaugeText,
  GaugeTickFill,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  LinearGauge,
  LinearGaugeInset,
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
  DEFAULT_RECIPE,
  STEAM_BAND,
  WINDOW,
  useEspressoSimulation,
  type Espresso,
  type Recipe,
} from "./espresso-simulation"
import HL from "./hairline/kernel"
import { pour } from "./hairline/pour"

/** Quick and without overshoot, so twenty readings a second glide together. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.15,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"
/** Drawn in the colour the cards are painted in, the page background, to
    cut a band into segments or a ring round a dot. */
const CUT = "var(--background)"
/** The one ink every mark is drawn in, thinned for the quieter tones. */
const INK = "var(--foreground)"
const fade = (percent: number) => fadeColor(INK, percent)

/** The pressure dial's scale and the shot timer's, bar and s. */
const PRESSURE_MAX = 12
const SHOT_MAX = 40

/** The sweep every knob here turns through, open at the bottom. */
const SWEEP = { startAngle: 40, endAngle: 320 } as const

/** The grind's travel, finest to coarsest. */
const GRIND_MIN = 1
const GRIND_MAX = 20

/* ---------- dials ---------- */

/**
 * The group head's pressure on a classic manometer: a pointer over a bar a
 * tick, with the band a shot should brew in drawn strong on the rim and the
 * pre-infusion band faint. The shot timer runs on a bar set into the open
 * foot of the dial, the window it should finish in shaded, so the pressure
 * and the time read as one instrument.
 */
const PressureDial = ({
  pressure,
  time,
}: {
  pressure: number
  time: number
}) => (
  <Gauge
    value={pressure}
    max={PRESSURE_MAX}
    startAngle={45}
    endAngle={315}
    padding={20}
    transition={FOLLOW}
  >
    <GaugeTrack width={14} color={INK} opacity={0.1} />
    <GaugeArc from={2} to={4} width={14} color={INK} opacity={0.35} />
    <GaugeArc from={8} to={10} width={14} color={INK} />
    <GaugeTicks
      count={48}
      length={6}
      width={1.5}
      offset={-18}
      color={MUTED}
      opacity={0.5}
    />
    <GaugeTicks count={12} length={14} width={3} offset={-22} color={INK} />
    <GaugeTickLabels
      count={6}
      offset={-58}
      fontSize={24}
      weight="semibold"
      color={MUTED}
    />
    <GaugeText y={-72} fontSize={22} weight="semibold" color={MUTED}>
      BAR
    </GaugeText>
    <LinearGaugeInset
      value={time}
      max={SHOT_MAX}
      length={190}
      y={152}
      scale={0.72}
      transition={FOLLOW}
    >
      <GaugeArc
        from={WINDOW[0]}
        to={WINDOW[1]}
        width={30}
        color={INK}
        opacity={0.15}
      />
      <GaugeTrack width={14} color={INK} opacity={0.12} />
      <GaugeArc width={14} color={INK} />
      <GaugeTickLabels
        count={4}
        offset={-44}
        fontSize={20}
        color={MUTED}
        format={(v) => (v === SHOT_MAX ? `${v}s` : String(v))}
      />
    </LinearGaugeInset>
    <GaugeNeedle
      style="pointer"
      length={0.62}
      width={18}
      tail={28}
      color={INK}
    />
    <GaugeHub radius={14} color={INK} />
    <GaugeHub radius={5} color={CUT} />
  </Gauge>
)

/** The brew boiler on a ring, its setpoint marked outside it, so a shot
    pulling it down shows as the gap between the two. */
const BrewDial = ({ temp, set }: { temp: number; set: number }) => (
  <Gauge value={temp} min={85} max={100} {...SWEEP} padding={24}>
    <GaugeTrack width={16} color={INK} opacity={0.12} />
    <GaugeArc width={16} color={INK} />
    <GaugeMarks values={[set]} offset={22} length={16} width={5} color={INK} />
    <GaugeValue
      y={-10}
      fontSize={76}
      font="rounded"
      weight="bold"
      format={(v) => v.toFixed(1)}
    />
    <GaugeText y={62} fontSize={40} weight="semibold" color={MUTED}>
      °C
    </GaugeText>
  </Gauge>
)

/** The steam boiler on a half dial, the band its element holds it in shaded
    under the pointer. */
const SteamDial = ({ steam }: { steam: number }) => (
  <Gauge
    value={steam}
    max={2}
    startAngle={90}
    endAngle={270}
    fit="content"
    padding={28}
    transition={FOLLOW}
  >
    <GaugeTrack width={40} color={INK} opacity={0.1} />
    <GaugeArc
      from={STEAM_BAND[0]}
      to={STEAM_BAND[1]}
      width={40}
      color={INK}
      opacity={0.35}
    />
    <GaugeNeedle style="pointer" length={0.95} width={36} tail={0} />
    <GaugeHub radius={22} color={INK} />
  </Gauge>
)

/* ---------- cup ---------- */

/** How far up the cup the target fills it, so every recipe ends a little
    under the brim and a shot that overruns shows above it. */
const CUP_TARGET = 0.8

/** The part of Hairline's 400 × 320 frame the cup is drawn in, with a little
    room round it: the figure leaves wide margins for its own page, which
    a column this narrow would draw it at half the size. */
const CUP_BOX = [74, 18, 252, 248] as const

/** The figure drawn in the example's own ink on the card, in place of
    Hairline's grey palette, and boxed to the drawing. */
const CUP_INK = {
  aspectRatio: `${CUP_BOX[2]} / ${CUP_BOX[3]}`,
  "--hairline-plate": CUT,
  "--hairline-hi": INK,
  "--hairline-edge": fade(55),
  "--hairline-mid": fade(35),
  "--hairline-lo": fade(18),
  "--hairline-stroke": "1",
} as CSSProperties

/**
 * The cup filling as the shot runs, beside the timer: a Hairline figure,
 * the coffee rising with the yield towards the target's height and running
 * from the nozzle while the pump runs. Driven like this the figure leaves
 * the pointer alone. It mounts once, before paint, and every reading after
 * reaches it through `pourTo`.
 */
const Cup = ({
  grams,
  target,
  pouring,
}: {
  grams: number
  target: number
  pouring: boolean
}) => {
  const host = useRef<HTMLDivElement>(null)
  const figure = useRef<ReturnType<typeof pour.mount> | null>(null)

  useLayoutEffect(() => {
    const stage = host.current
    if (!stage) return
    HL.inject(document)
    const svg = HL.mk(
      "svg",
      { viewBox: CUP_BOX.join(" "), "aria-hidden": "true" },
      stage
    )
    figure.current = pour.mount(
      { stage, svg, read: { textContent: "" } },
      pour.range[1]
    )
    return () => {
      figure.current?.destroy()
      figure.current = null
      svg.remove()
    }
  }, [])

  const level = Math.min(1, (grams / target) * CUP_TARGET)
  useEffect(() => {
    figure.current?.pourTo(level, pouring)
  }, [level, pouring])

  return (
    <div
      ref={host}
      data-hairline="pour"
      role="img"
      aria-label={`An espresso cup holding ${grams.toFixed(1)} of ${target.toFixed(1)} g`}
      style={CUP_INK}
      className="w-full"
    />
  )
}

/* ---------- bars ---------- */

/** Bar lengths in SVG units, near the width their column draws them, so
    their labels keep their size. */
const LONG = 440
const SHORT = 360

/**
 * The cup filling towards the shot's target, which is marked across the
 * bar. The scale runs a little past the target, so a shot that overruns it
 * shows by how much.
 */
const YieldBar = ({ grams, target }: { grams: number; target: number }) => {
  const max = Math.ceil((target * 1.25) / 10) * 10
  return (
    <LinearGauge
      value={grams}
      max={max}
      length={LONG}
      transition={FOLLOW}
      padding={{ top: 16, bottom: 30, left: 10, right: 14 }}
    >
      <GaugeTrack width={16} color={INK} opacity={0.1} />
      <GaugeArc width={16} color={INK} />
      <GaugeMarks values={[target]} length={30} width={3} color={MUTED} />
      <GaugeTickLabels
        count={max / 10}
        offset={-26}
        fontSize={12}
        color={MUTED}
      />
    </LinearGauge>
  )
}

/** The flow into the cup on a segmented meter. */
const FlowBar = ({ flow }: { flow: number }) => (
  <LinearGauge
    value={flow}
    max={4}
    length={LONG}
    transition={FOLLOW}
    padding={{ top: 8, bottom: 8, left: 10, right: 14 }}
  >
    <GaugeTickFill
      count={32}
      length={14}
      width={8}
      color={INK}
      dimColor={fade(10)}
    />
  </LinearGauge>
)

/** The water tank as a column, cut into quarters, low water marked. */
const Tank = ({ level }: { level: number }) => (
  <LinearGauge
    value={level * 100}
    orientation="vertical"
    length={160}
    transition={FOLLOW}
    padding={{ top: 16, bottom: 16, left: 22, right: 22 }}
    className="h-28"
  >
    <GaugeTrack width={30} color={INK} opacity={0.1} />
    <GaugeArc width={30} color={INK} />
    <GaugeMarks count={4} length={30} width={3} color={CUT} />
    <GaugeMarks values={[15]} length={44} width={3} color={MUTED} />
  </LinearGauge>
)

/* ---------- controls ---------- */

/**
 * A rotary knob: a scale of ticks outside a thin ring, a cap with the
 * pointer dot on it, and the value in the middle.
 */
const Knob = ({
  value,
  onChange,
  min,
  max,
  step,
  label,
  format,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label: string
  format: (value: number) => string
}) => (
  <div className="flex min-w-0 flex-col items-center gap-1.5">
    <GaugeControl
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      {...SWEEP}
      knob
      label={label}
      valueText={format(value)}
      className="w-full max-w-24"
    >
      <Gauge value={value} min={min} max={max} {...SWEEP} padding={20}>
        <GaugeTicks
          count={20}
          length={10}
          width={3}
          offset={22}
          color={MUTED}
          opacity={0.45}
        />
        <GaugeTrack width={10} color={INK} opacity={0.12} />
        <GaugeArc width={10} color={INK} />
        <GaugeHub radius={156} color={fade(7)} />
        <GaugeDot radius={12} offset={-70} color={INK} />
        <GaugeValue
          fontSize={56}
          font="rounded"
          weight="bold"
          format={format}
        />
      </Gauge>
    </GaugeControl>
    <Caption>{label}</Caption>
  </div>
)

/**
 * The grinder's setting as a slider: a step a tick, the burrs closing to
 * the left. Drag along it, or Tab to it and use the arrow keys.
 */
const GrindSlider = ({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) => (
  <GaugeControl
    value={value}
    onChange={onChange}
    orientation="horizontal"
    length={SHORT}
    min={GRIND_MIN}
    max={GRIND_MAX}
    label="Grind"
    valueText={`Grind ${value} of ${GRIND_MAX}`}
    className="w-full"
  >
    <LinearGauge
      value={value}
      min={GRIND_MIN}
      max={GRIND_MAX}
      length={SHORT}
      padding={{ top: 22, bottom: 22, left: 16, right: 16 }}
    >
      <GaugeTicks
        count={GRIND_MAX - GRIND_MIN}
        offset={-16}
        length={8}
        width={2}
        color={MUTED}
        opacity={0.5}
      />
      <GaugeTrack width={6} color={INK} opacity={0.12} />
      <GaugeArc width={6} color={INK} />
      <GaugeDot radius={13} color={INK} halo={5} haloColor={CUT} />
    </LinearGauge>
  </GaugeControl>
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
      <span className="ml-1 text-xs font-bold text-muted-foreground uppercase">
        {unit}
      </span>
    )}
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

/** A gauge with its name in small capitals under it. */
const Labelled = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex min-w-0 flex-col items-center gap-1">
    {children}
    <span className="text-[10px] font-semibold tracking-widest whitespace-nowrap text-muted-foreground uppercase">
      {label}
    </span>
  </div>
)

/* ---------- sections ---------- */

/** What the shot is doing, and once it stops, how it went against the
    window and which way to turn the grinder. */
const shotStatus = ({ phase, time, yield: grams }: Espresso) => {
  if (phase === "ready") return "Ready for the next shot"
  if (phase === "preinfusion") return "Pre-infusion"
  if (phase === "extraction") return "Extracting"
  const pulled = `${grams.toFixed(1)} g in ${time.toFixed(1)} s`
  if (time < WINDOW[0]) return `${pulled}: fast, grind finer`
  if (time > WINDOW[1]) return `${pulled}: slow, grind coarser`
  return `${pulled}: in the window`
}

const Shot = ({ espresso, recipe }: { espresso: Espresso; recipe: Recipe }) => (
  <Panel
    title="Shot"
    description={`${recipe.dose.toFixed(1)} g in, ${espresso.target.toFixed(1)} g out, in ${WINDOW[0]}–${WINDOW[1]} s`}
    action={`Shot ${espresso.shots}`}
    className="sm:col-span-2"
  >
    <div className="grid items-center gap-6 sm:grid-cols-[15rem_1fr]">
      <div className="mx-auto w-full max-w-60">
        <PressureDial pressure={espresso.pressure} time={espresso.time} />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-6">
            <div className="w-16 shrink-0">
              <Cup
                grams={espresso.yield}
                target={espresso.target}
                pouring={
                  (espresso.phase === "preinfusion" ||
                    espresso.phase === "extraction") &&
                  espresso.flow > 0.05
                }
              />
            </div>
            <div className="flex flex-col">
              <Figure
                value={espresso.time.toFixed(1)}
                unit="s"
                className="text-4xl"
              />
              <Caption>{shotStatus(espresso)}</Caption>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Figure
              value={espresso.pressure.toFixed(1)}
              unit="bar"
              className="text-lg"
            />
            <Caption>at the group</Caption>
          </div>
        </div>
        <Row
          label="Yield"
          value={`${espresso.yield.toFixed(1)} of ${espresso.target.toFixed(1)} g`}
        >
          <YieldBar grams={espresso.yield} target={espresso.target} />
        </Row>
        <Row label="Flow" value={`${espresso.flow.toFixed(1)} g/s`}>
          <FlowBar flow={espresso.flow} />
        </Row>
      </div>
    </div>
  </Panel>
)

const Boilers = ({
  espresso,
  recipe,
}: {
  espresso: Espresso
  recipe: Recipe
}) => (
  <Panel
    title="Boilers"
    description="Brew and steam, and the water tank"
    action={espresso.heating ? "Steam heating" : "Steam holding"}
  >
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
      <Labelled label="Brew">
        <div className="w-full max-w-28">
          <BrewDial temp={espresso.brewTemp} set={recipe.temp} />
        </div>
      </Labelled>
      <Labelled label="Steam">
        <div className="flex w-full max-w-28 flex-col items-center gap-1">
          <SteamDial steam={espresso.steam} />
          <span className="text-xs font-semibold tabular-nums">
            {espresso.steam.toFixed(2)} bar
          </span>
        </div>
      </Labelled>
      <Labelled label="Tank">
        <div className="flex flex-col items-center gap-1">
          <Tank level={espresso.tank} />
          <span className="text-xs font-semibold tabular-nums">
            {Math.round(espresso.tank * 100)}%
          </span>
        </div>
      </Labelled>
    </div>
  </Panel>
)

const RecipePanel = ({
  recipe,
  onChange,
}: {
  recipe: Recipe
  onChange: (change: Partial<Recipe>) => void
}) => (
  <Panel title="Recipe" description="Turn the grinder to land in the window">
    <Row label="Grind" value={`${recipe.grind} of ${GRIND_MAX}`}>
      <GrindSlider
        value={recipe.grind}
        onChange={(grind) => onChange({ grind })}
      />
      <div className="flex justify-between">
        <Caption>Fine</Caption>
        <Caption>Coarse</Caption>
      </div>
    </Row>
    <div className="grid grid-cols-3 gap-4">
      <Knob
        value={recipe.dose}
        onChange={(dose) => onChange({ dose })}
        min={16}
        max={22}
        step={0.5}
        label="Dose g"
        format={(v) => v.toFixed(1)}
      />
      <Knob
        value={recipe.ratio}
        onChange={(ratio) => onChange({ ratio })}
        min={1.5}
        max={3}
        step={0.1}
        label="Ratio"
        format={(v) => `1:${v.toFixed(1)}`}
      />
      <Knob
        value={recipe.temp}
        onChange={(temp) => onChange({ temp })}
        min={88}
        max={96}
        step={0.5}
        label="Brew °C"
        format={(v) => v.toFixed(1)}
      />
    </div>
  </Panel>
)

/**
 * An espresso machine pulling shots on a loop: the group's pressure on a
 * manometer with the shot timer set into its foot, the cup filling towards
 * its target and the flow on a meter, the boilers on their dials beside the
 * water tank, and the recipe on a grinder slider and three knobs. The
 * controls feed the shot, so grinding finer slows the next one down and a
 * coarse grind gushes without building pressure.
 */
export const EspressoMachine = () => {
  const frame = useRef<HTMLDivElement>(null)
  const [recipe, setRecipe] = useState(DEFAULT_RECIPE)
  const espresso = useEspressoSimulation(frame, recipe)
  const change = (part: Partial<Recipe>) =>
    setRecipe((current) => ({ ...current, ...part }))

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Shot espresso={espresso} recipe={recipe} />
      <Boilers espresso={espresso} recipe={recipe} />
      <RecipePanel recipe={recipe} onChange={change} />
    </div>
  )
}
