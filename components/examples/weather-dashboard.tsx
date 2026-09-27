"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  CloudAngledRainIcon,
  CloudIcon,
  DashboardSpeed01Icon,
  EyeIcon,
  FastWindIcon,
  HumidityIcon,
  Leaf01Icon,
  Location01Icon,
  MoonCloudIcon,
  SunCloud02Icon,
  SunriseIcon,
  UvIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeHub,
  GaugeMarks,
  GaugeNeedle,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  clockTime,
  compassLabel,
  durationLabel,
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
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/** Every gauge sweeps up from the foot of its domain as the tab opens. */
const ARRIVE: GaugeTransition = { type: "spring", visualDuration: 1, bounce: 0 }
/** A vane swings into the wind and settles with a little overshoot. */
const VANE: GaugeTransition = {
  type: "spring",
  visualDuration: 0.9,
  bounce: 0.25,
}

const MUTED = "var(--muted-foreground)"
/** Cuts drawn in the card's own colour, to split a band into segments. */
const CUT = "var(--card)"

/** The one ink every mark is drawn in, as the studio templates keep to. */
const INK = "var(--foreground)"

/** The ink thinned towards transparent, for the quieter tones. */
const fade = (percent: number) => fadeColor(INK, percent)

/** The top half of a dial, left to right. */
const half = { startAngle: 90, endAngle: 270, fit: "content" } as const
/** A full ring from twelve o'clock. */
const ring = { startAngle: 180, endAngle: 540 } as const

const pad = (n: number) => String(n).padStart(2, "0")

const degrees = (t: number) => `${Math.round(t)}°`

/* ---------- the forecast ---------- */

type Sky = "partly" | "cloud" | "rain" | "night"

const SKY: Record<Sky, { icon: IconSvgElement; label: string }> = {
  partly: { icon: SunCloud02Icon, label: "Partly cloudy" },
  cloud: { icon: CloudIcon, label: "Cloudy" },
  rain: { icon: CloudAngledRainIcon, label: "Rain" },
  night: { icon: MoonCloudIcon, label: "Clouds breaking" },
}

type Hour = {
  /** Hour of the day, 0–23. */
  hour: number
  sky: Sky
  /** °C */
  temp: number
  feels: number
  dew: number
  /** Chance of rain, % */
  rain: number
  /** m/s, and the bearing it blows from */
  wind: number
  gust: number
  from: number
  /** % */
  humidity: number
  cloud: number
  uv: number
  /** km */
  visibility: number
}

/**
 * A Reykjavík afternoon at the end of September: a south-easterly freshening
 * ahead of a band of rain that comes through in the evening and clears after
 * midnight as the wind backs south.
 */
const HOURS: Hour[] = [
  {
    hour: 14,
    sky: "partly",
    temp: 9.4,
    feels: 6,
    dew: 5,
    rain: 10,
    wind: 9,
    gust: 14,
    from: 135,
    humidity: 74,
    cloud: 62,
    uv: 2,
    visibility: 42,
  },
  {
    hour: 15,
    sky: "partly",
    temp: 10.1,
    feels: 7,
    dew: 5,
    rain: 10,
    wind: 10,
    gust: 15,
    from: 130,
    humidity: 72,
    cloud: 70,
    uv: 1,
    visibility: 40,
  },
  {
    hour: 16,
    sky: "cloud",
    temp: 9.8,
    feels: 6,
    dew: 6,
    rain: 20,
    wind: 11,
    gust: 17,
    from: 125,
    humidity: 77,
    cloud: 84,
    uv: 1,
    visibility: 35,
  },
  {
    hour: 17,
    sky: "cloud",
    temp: 9.1,
    feels: 5,
    dew: 6,
    rain: 40,
    wind: 12,
    gust: 18,
    from: 120,
    humidity: 82,
    cloud: 92,
    uv: 0,
    visibility: 28,
  },
  {
    hour: 18,
    sky: "rain",
    temp: 8.3,
    feels: 4,
    dew: 7,
    rain: 70,
    wind: 13,
    gust: 20,
    from: 115,
    humidity: 89,
    cloud: 100,
    uv: 0,
    visibility: 14,
  },
  {
    hour: 19,
    sky: "rain",
    temp: 7.8,
    feels: 3,
    dew: 7,
    rain: 90,
    wind: 14,
    gust: 22,
    from: 110,
    humidity: 93,
    cloud: 100,
    uv: 0,
    visibility: 8,
  },
  {
    hour: 20,
    sky: "rain",
    temp: 7.4,
    feels: 3,
    dew: 7,
    rain: 90,
    wind: 15,
    gust: 23,
    from: 110,
    humidity: 95,
    cloud: 100,
    uv: 0,
    visibility: 6,
  },
  {
    hour: 21,
    sky: "rain",
    temp: 7.0,
    feels: 3,
    dew: 6,
    rain: 80,
    wind: 14,
    gust: 21,
    from: 118,
    humidity: 95,
    cloud: 100,
    uv: 0,
    visibility: 9,
  },
  {
    hour: 22,
    sky: "rain",
    temp: 6.6,
    feels: 2,
    dew: 6,
    rain: 60,
    wind: 12,
    gust: 19,
    from: 128,
    humidity: 94,
    cloud: 96,
    uv: 0,
    visibility: 14,
  },
  {
    hour: 23,
    sky: "cloud",
    temp: 6.1,
    feels: 2,
    dew: 5,
    rain: 40,
    wind: 10,
    gust: 16,
    from: 142,
    humidity: 92,
    cloud: 88,
    uv: 0,
    visibility: 22,
  },
  {
    hour: 0,
    sky: "cloud",
    temp: 5.6,
    feels: 2,
    dew: 4,
    rain: 20,
    wind: 9,
    gust: 14,
    from: 160,
    humidity: 90,
    cloud: 74,
    uv: 0,
    visibility: 30,
  },
  {
    hour: 1,
    sky: "night",
    temp: 5.2,
    feels: 2,
    dew: 4,
    rain: 10,
    wind: 8,
    gust: 12,
    from: 178,
    humidity: 89,
    cloud: 48,
    uv: 0,
    visibility: 38,
  },
]

/** Minutes into the current hour, for the clock and the sun. */
const NOW_MINUTES = 20

/** Today's extremes, for the marks on the temperature dial. */
const LOW = 4.8
const HIGH = 10.3

/** Reykjavík on the 27th of September, in hours from midnight. */
const SUNRISE = 7 + 31 / 60
const SUNSET = 19 + 9 / 60
const TOMORROW_SUNRISE = 7 + 34 / 60

/** hPa: now, and where the set hand was left three hours ago. */
const PRESSURE = 1003.6
const PRESSURE_SET = 1008.9

const AQI = 18
const POLLUTANTS = [
  { label: "PM2.5", value: "4 µg/m³" },
  { label: "PM10", value: "9 µg/m³" },
  { label: "O₃", value: "52 µg/m³" },
  { label: "NO₂", value: "7 µg/m³" },
]

/** The Beaufort scale's upper bounds in m/s, force 0 to 11; 12 is the rest. */
const BEAUFORT = [
  0.5, 1.5, 3.3, 5.5, 7.9, 10.7, 13.8, 17.1, 20.7, 24.4, 28.4, 32.6,
]
const BEAUFORT_NAMES = [
  "Calm",
  "Light air",
  "Light breeze",
  "Gentle breeze",
  "Moderate breeze",
  "Fresh breeze",
  "Strong breeze",
  "Near gale",
  "Gale",
  "Strong gale",
  "Storm",
  "Violent storm",
  "Hurricane",
]
const beaufort = (speed: number) => {
  const force = BEAUFORT.findIndex((top) => speed < top)
  return force === -1 ? 12 : force
}

const uvLabel = (uv: number) =>
  uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : "Very high"

/* ---------- live wind ---------- */

type Wind = { speed: number; from: number }

/**
 * Gusts the wind around the hour's forecast every second and a half while
 * the dashboard is on screen and showing the present: the speed drifts
 * between the mean and the gusts, and the vane hunts either side of the
 * bearing. A forecast hour holds still, and so does reduced motion.
 */
const useLiveWind = (visible: boolean, hour: Hour, live: boolean) => {
  const [wind, setWind] = useState<Wind>({
    speed: HOURS[0].wind,
    from: HOURS[0].from,
  })

  useEffect(() => {
    if (!visible || !live) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(
      () =>
        setWind((w) => {
          const lull = hour.wind - 3
          const pull = w.speed + (hour.wind - w.speed) * 0.3
          const speed = Math.min(
            hour.gust,
            Math.max(lull, pull + (Math.random() * 2 - 1) * 3)
          )
          const swing = w.from + (hour.from - w.from) * 0.35
          const from = swing + (Math.random() * 2 - 1) * 9
          return { speed, from }
        }),
      1500
    )
    return () => window.clearInterval(id)
  }, [visible, live, hour])

  return live ? wind : { speed: hour.wind, from: hour.from }
}

/* ---------- gauges ---------- */

/**
 * The Temperature template in one ink: the reading fills the track, the band
 * inside it runs freezing, mild and warm, and the day's low and high are
 * notched across that band.
 */
const TemperatureDial = ({ temp }: { temp: number }) => (
  <Gauge
    value={temp}
    min={-20}
    max={30}
    startAngle={40}
    endAngle={320}
    padding={20}
    transition={ARRIVE}
    initialValue={-20}
  >
    <GaugeTrack width={16} color={INK} opacity={0.14} />
    <GaugeArc width={16} color={INK} />
    <GaugeZones
      zones={[
        { to: 0, color: fade(22) },
        { to: 15, color: fade(50) },
        { to: 30, color: INK },
      ]}
      width={6}
      offset={-20}
      gap={1}
    />
    <GaugeMarks
      values={[LOW, HIGH]}
      length={14}
      width={3}
      offset={-20}
      cap="butt"
      color={INK}
    />
    <GaugeTicks
      count={50}
      length={6}
      width={1.5}
      offset={-34}
      color={MUTED}
      opacity={0.5}
    />
    <GaugeValue
      y={4}
      fontSize={100}
      font="rounded"
      weight="bold"
      format={degrees}
    />
    <GaugeText y={-68} fontSize={26} color={MUTED}>
      °C
    </GaugeText>
    <GaugeText
      y={76}
      fontSize={24}
      font="rounded"
      weight="semibold"
      color={MUTED}
    >
      {`${Math.round(LOW)}° · ${Math.round(HIGH)}°`}
    </GaugeText>
  </Gauge>
)

/**
 * The Wind direction template: the arrowhead points at the bearing the wind
 * blows from, the counterweight rides the far rim, and the speed sits in the
 * gap the arrow leaves round the centre.
 */
const WindDial = ({ speed, from }: { speed: number; from: number }) => (
  <Gauge
    value={from}
    min={0}
    max={360}
    {...ring}
    padding={24}
    transition={VANE}
    initialValue={0}
  >
    <GaugeTrack width={24} color={INK} opacity={0.12} cap="butt" />
    <GaugeTicks count={4} length={8} width={3} color={INK} opacity={0.7} />
    <GaugeTicks count={36} length={4} width={3} color={MUTED} opacity={0.5} />
    <GaugeTickLabels
      count={4}
      offset={-44}
      fontSize={30}
      font="rounded"
      weight="bold"
      color={MUTED}
      format={compassLabel}
    />
    <GaugeNeedle
      style="arrow"
      length={1.05}
      width={7}
      tail={200}
      tailDot={12}
      gap={84}
      color={INK}
    />
    <GaugeText y={-4} fontSize={72} font="rounded" weight="bold">
      {Math.round(speed)}
    </GaugeText>
    <GaugeText y={44} fontSize={24} color={MUTED}>
      m/s
    </GaugeText>
  </Gauge>
)

/**
 * The Sun path template: a half circle standing on the horizon from sunrise
 * to sunset, with the sun as a dot on the head of the daylight already spent.
 * Once it has set, the dot goes and the middle counts down to tomorrow's.
 */
const SunDial = ({ at }: { at: number }) => {
  const up = at >= SUNRISE && at <= SUNSET
  const untilRise = (TOMORROW_SUNRISE + 24 - at) % 24
  return (
    <Gauge
      value={at}
      min={SUNRISE}
      max={SUNSET}
      {...half}
      padding={20}
      transition={ARRIVE}
      initialValue={SUNRISE}
    >
      <GaugeTrack width={26} color={INK} opacity={0.1} />
      <GaugeArc width={24} color={INK} opacity={0.22} />
      <GaugeTicks count={24} length={2} width={3} color={INK} opacity={0.4} />
      {up && <GaugeDot radius={17} color={INK} halo={7} haloColor={CUT} />}
      <GaugeText y={-60} fontSize={52} font="rounded" weight="bold">
        {up ? durationLabel(SUNSET - at) : durationLabel(untilRise)}
      </GaugeText>
      <GaugeText y={-10} fontSize={26} color={MUTED}>
        {up ? "of daylight left" : "until sunrise"}
      </GaugeText>
    </Gauge>
  )
}

/**
 * The Air quality template: a half dial on the 0–500 index, the good,
 * moderate and unhealthy bands inside it with a mark at each cutoff.
 */
const AirQualityDial = ({ aqi }: { aqi: number }) => (
  <Gauge
    value={aqi}
    max={500}
    {...half}
    padding={20}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={20} color={INK} opacity={0.14} />
    <GaugeArc width={20} color={INK} />
    <GaugeZones
      zones={[
        { to: 50, color: fade(18) },
        { to: 100, color: fade(45) },
        { to: 500, color: INK },
      ]}
      width={6}
      offset={-22}
      gap={2}
      endCap="round"
    />
    <GaugeMarks values={[50, 100]} length={10} width={2} offset={-22} />
    <GaugeValue y={-62} fontSize={80} font="rounded" weight="bold" />
    <GaugeText y={-8} fontSize={28} color={MUTED}>
      AQI
    </GaugeText>
  </Gauge>
)

/** The words round an aneroid barometer, at 960, 980, 1000, 1020 and 1040 hPa. */
const BAROMETER_WORDS = ["Stormy", "Rain", "Change", "Fair", "Dry"]

/**
 * An aneroid barometer: a pointer on the pressure, a hectopascal a tick, the
 * old weather words round the face, and the set hand as a mark on the rim
 * where the pressure stood three hours ago. The stretch between is the fall,
 * and the pointer swings down it as the dial opens.
 */
const Barometer = ({ hpa, set }: { hpa: number; set: number }) => (
  <Gauge
    value={hpa}
    min={960}
    max={1040}
    startAngle={45}
    endAngle={315}
    padding={20}
    transition={ARRIVE}
    initialValue={set}
  >
    <GaugeTrack width={14} color={INK} opacity={0.1} cap="butt" />
    {/* Anchored at the set hand, the fall grows with the pointer as the dial
        opens, whichever way the pressure has gone. */}
    <GaugeArc from={set} width={14} color={INK} opacity={0.35} cap="butt" />
    <GaugeTicks
      count={80}
      length={6}
      width={1.5}
      offset={-18}
      cap="butt"
      color={MUTED}
      opacity={0.5}
    />
    <GaugeTicks
      count={8}
      length={14}
      width={3}
      offset={-22}
      cap="butt"
      color={INK}
    />
    <GaugeTickLabels
      count={4}
      offset={-58}
      fontSize={21}
      weight="semibold"
      color={MUTED}
      format={(v) => BAROMETER_WORDS[Math.round((v - 960) / 20)]}
    />
    <GaugeMarks values={[set]} length={30} width={5} cap="butt" color={INK} />
    <GaugeNeedle
      style="pointer"
      length={0.56}
      width={18}
      tail={28}
      color={INK}
    />
    <GaugeHub radius={14} color={INK} />
    <GaugeHub radius={5} color={CUT} />
  </Gauge>
)

/**
 * The small half dial on the condition tiles: the whole scale as a track and
 * whatever the reading needs drawn over it.
 */
const TileDial = ({
  value,
  max,
  children,
}: {
  value: number
  max: number
  children: ReactNode
}) => (
  <Gauge
    value={value}
    max={max}
    {...half}
    padding={32}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={36} color={INK} opacity={0.14} cap="butt" />
    {children}
  </Gauge>
)

/** Chance of rain as a solid ring small enough to sit under an hour. */
const RainRing = ({ chance }: { chance: number }) => (
  <Gauge
    value={chance}
    max={100}
    {...ring}
    padding={40}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={80} color={INK} opacity={0.14} cap="butt" />
    <GaugeArc width={80} color={INK} cap="butt" />
  </Gauge>
)

/* ---------- charts ---------- */

/** The strongest gust ahead, which tops the wind chart's scale. */
const GUST_PEAK = Math.max(...HOURS.map((h) => h.gust))

/**
 * The hours ahead as bars: the gusts faint behind, the mean wind solid in
 * front, and the hour picked above in full ink.
 */
const WindBars = ({ selected }: { selected: number }) => (
  <div className="flex flex-col gap-1.5">
    <div className="grid h-12 grid-cols-12 gap-1">
      {HOURS.map((h, i) => (
        <div key={h.hour} className="relative">
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-1.5 rounded-full"
            style={{
              height: share(h.gust, 0, GUST_PEAK),
              background: fade(14),
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-1.5 rounded-full"
            style={{
              height: share(h.wind, 0, GUST_PEAK),
              background: i === selected ? INK : fade(40),
            }}
          />
        </div>
      ))}
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
      <span>Now</span>
      <span>{clockTime(HOURS[HOURS.length - 1].hour)}</span>
    </div>
  </div>
)

/** Where a value sits between `lo` and `hi`, as a percentage. */
const share = (value: number, lo: number, hi: number) =>
  `${((value - lo) / (hi - lo)) * 100}%`

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

/** A condition tile: the category, the figure, a small dial and a caption. */
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

const SkyIcon = ({ sky, className }: { sky: Sky; className?: string }) => (
  <HugeiconsIcon
    icon={SKY[sky].icon}
    strokeWidth={1.75}
    className={cn("size-5", className)}
    aria-label={SKY[sky].label}
  />
)

/* ---------- sections ---------- */

/**
 * The hours ahead, one button each: the time, the sky, the temperature and
 * the chance of rain on a ring. Picking one runs every dial on the page to
 * that hour.
 */
const Hourly = ({
  selected,
  onSelect,
}: {
  selected: number
  onSelect: (index: number) => void
}) => (
  <div className="-mx-1 flex overflow-x-auto pb-1">
    {HOURS.map((h, i) => (
      <button
        key={h.hour}
        type="button"
        onClick={() => onSelect(i)}
        aria-pressed={i === selected}
        className={cn(
          "flex w-13 shrink-0 flex-col items-center gap-2 rounded-lg px-1 py-2 text-xs transition-colors",
          "outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
          i === selected && "bg-muted"
        )}
      >
        <span
          className={cn(
            "font-medium tabular-nums",
            i === selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {i === 0 ? "Now" : pad(h.hour)}
        </span>
        <SkyIcon sky={h.sky} />
        <span className="font-rounded text-sm font-bold tabular-nums">
          {degrees(h.temp)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
          <span className="size-2.5">
            <RainRing chance={h.rain} />
          </span>
          {h.rain}%
        </span>
      </button>
    ))}
  </div>
)

const Now = ({
  hour,
  selected,
  onSelect,
}: {
  hour: Hour
  selected: number
  onSelect: (index: number) => void
}) => (
  <Panel
    heading={<Category icon={Location01Icon}>Reykjavík</Category>}
    action={
      selected === 0
        ? `Sun 27 Sep · ${pad(hour.hour)}:${pad(NOW_MINUTES)}`
        : `Forecast for ${clockTime(hour.hour)}`
    }
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <TemperatureDial temp={hour.temp} />
      <div className="flex flex-col gap-4">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SkyIcon sky={hour.sky} className="size-4" />
          {SKY[hour.sky].label}
        </span>
        <Readouts
          rows={[
            { label: "Feels like", value: degrees(hour.feels) },
            { label: "Dew point", value: degrees(hour.dew) },
            { label: "Chance of rain", value: `${hour.rain}%` },
            {
              label: "Low · High",
              value: `${Math.round(LOW)}° · ${Math.round(HIGH)}°`,
            },
          ]}
        />
      </div>
    </div>
    <Hourly selected={selected} onSelect={onSelect} />
  </Panel>
)

const WindPanel = ({
  wind,
  hour,
  selected,
}: {
  wind: Wind
  hour: Hour
  selected: number
}) => {
  const force = beaufort(wind.speed)
  return (
    <Panel
      heading={<Category icon={FastWindIcon}>Wind</Category>}
      action={`From ${compassLabel(Math.round(hour.from / 22.5) * 22.5)}`}
    >
      <div className="grid grid-cols-2 items-center gap-6">
        <WindDial speed={wind.speed} from={wind.from} />
        <Readouts
          rows={[
            { label: "Speed", value: `${wind.speed.toFixed(1)} m/s` },
            { label: "Gusts", value: `${hour.gust} m/s` },
            { label: "Bearing", value: `${Math.round(wind.from)}°` },
            { label: "Beaufort", value: `${force}, ${BEAUFORT_NAMES[force]}` },
          ]}
        />
      </div>
      <WindBars selected={selected} />
    </Panel>
  )
}

const Sun = ({ at }: { at: number }) => (
  <Panel
    heading={<Category icon={SunriseIcon}>Sun</Category>}
    action={`${clockTime(SUNRISE)} – ${clockTime(SUNSET)}`}
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <SunDial at={at} />
      <Readouts
        rows={[
          { label: "Sunrise", value: clockTime(SUNRISE) },
          { label: "Sunset", value: clockTime(SUNSET) },
          { label: "Daylight", value: durationLabel(SUNSET - SUNRISE) },
          { label: "Tomorrow", value: "−6m 32s" },
        ]}
      />
    </div>
  </Panel>
)

const Pressure = () => (
  <Panel
    heading={<Category icon={DashboardSpeed01Icon}>Pressure</Category>}
    action="Falling"
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <Barometer hpa={PRESSURE} set={PRESSURE_SET} />
      <Readouts
        rows={[
          { label: "Now", value: `${PRESSURE.toFixed(1)} hPa` },
          { label: "3 h ago", value: `${PRESSURE_SET.toFixed(1)} hPa` },
          {
            label: "Change",
            value: `${(PRESSURE - PRESSURE_SET).toFixed(1)} hPa`,
          },
          { label: "Outlook", value: "Rain, wind" },
        ]}
      />
    </div>
  </Panel>
)

const AirQuality = () => (
  <Panel
    heading={<Category icon={Leaf01Icon}>Air quality</Category>}
    action="Good"
  >
    <div className="grid grid-cols-2 items-center gap-6">
      <AirQualityDial aqi={AQI} />
      <Readouts rows={POLLUTANTS} />
    </div>
  </Panel>
)

const Conditions = ({ hour }: { hour: Hour }) => (
  <div className="grid grid-cols-2 gap-3">
    <Tile
      icon={HumidityIcon}
      label="Humidity"
      value={`${hour.humidity}`}
      unit="%"
      caption="Comfortable 30–60%"
    >
      {/* The comfortable band on the track, and a dot at the reading. */}
      <TileDial value={hour.humidity} max={100}>
        <GaugeArc
          from={30}
          to={60}
          width={36}
          color={INK}
          opacity={0.4}
          cap="butt"
        />
        <GaugeDot radius={20} color={INK} halo={10} haloColor={CUT} />
      </TileDial>
    </Tile>
    <Tile
      icon={CloudIcon}
      label="Cloud cover"
      value={`${hour.cloud}`}
      unit="%"
      caption={`${Math.round(hour.cloud / 12.5)} of 8 oktas`}
    >
      {/* A plain fill, cut into eighths for the oktas. */}
      <TileDial value={hour.cloud} max={100}>
        <GaugeArc width={36} color={INK} cap="butt" />
        <GaugeMarks count={8} length={40} width={6} cap="butt" color={CUT} />
      </TileDial>
    </Tile>
    <Tile
      icon={UvIcon}
      label="UV index"
      value={`${hour.uv}`}
      caption={uvLabel(hour.uv)}
    >
      {/* One segment per step of the index, lit up to the reading. */}
      <TileDial value={hour.uv} max={11}>
        <GaugeArc width={36} color={INK} cap="butt" />
        <GaugeMarks count={11} length={40} width={6} cap="butt" color={CUT} />
      </TileDial>
    </Tile>
    <Tile
      icon={EyeIcon}
      label="Visibility"
      value={`${hour.visibility}`}
      unit="km"
      caption={hour.visibility < 10 ? "Reduced in rain" : "Clear"}
    >
      {/* A needle, faint fill behind it, as the monitor's sensor tiles. */}
      <TileDial value={hour.visibility} max={50}>
        <GaugeArc width={36} color={INK} opacity={0.3} cap="butt" />
        <GaugeNeedle
          style="pointer"
          length={0.95}
          width={36}
          tail={0}
          color={INK}
        />
        <GaugeHub radius={22} color={INK} />
      </TileDial>
    </Tile>
  </div>
)

/**
 * A weather app on gauges: the temperature on the Temperature template with
 * the hours ahead under it, wind on the Wind direction template gusting live,
 * the sun on the Sun path template, an aneroid barometer with its set hand,
 * air quality on its bands and a row of condition tiles.
 * Picking an hour runs every dial on the page to it.
 */
export const WeatherDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const hour = HOURS[selected]
  const wind = useLiveWind(useInView(frame), hour, selected === 0)
  const at = hour.hour + (selected === 0 ? NOW_MINUTES / 60 : 0)

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Now hour={hour} selected={selected} onSelect={setSelected} />
      <WindPanel wind={wind} hour={hour} selected={selected} />
      <Sun at={at} />
      <Pressure />
      <AirQuality />
      <Conditions hour={hour} />
    </div>
  )
}
