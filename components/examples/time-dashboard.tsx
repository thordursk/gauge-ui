"use client"

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  Flag02Icon,
  Moon02Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeHub,
  GaugeInset,
  GaugeNeedle,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  clockLabel,
  clockTime,
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

const MUTED = "var(--muted-foreground)"

/** A reset refills a timer's ring with a sweep rather than a jump. */
const REFILL: GaugeTransition = {
  type: "spring",
  visualDuration: 0.6,
  bounce: 0,
}

/** Every full-circle dial here starts at twelve o'clock and goes round once. */
const ring = { startAngle: 180, endAngle: 540 } as const

const pad = (n: number) => String(n).padStart(2, "0")

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/* ---------- time sources ---------- */

/** Fires on every whole second of the wall clock, so every face ticks together. */
const subscribeSeconds = (onTick: () => void) => {
  let id = 0
  const schedule = () => {
    id = window.setTimeout(
      () => {
        onTick()
        schedule()
      },
      1000 - (Date.now() % 1000)
    )
  }
  schedule()
  return () => window.clearTimeout(id)
}

const currentSecond = () => Math.floor(Date.now() / 1000) * 1000

/**
 * The wall clock to the second. The server has no "now" the visitor's
 * browser would agree with, so it renders null and the faces come up bare.
 */
const useNow = () =>
  useSyncExternalStore(subscribeSeconds, currentSecond, () => null)

/**
 * The animation frame's timestamp, on the `performance.now()` clock, for as
 * long as `active` holds. Stopwatch and timers keep their own start times and
 * only read this to know how far they have got, so a frozen frame costs them
 * nothing but smoothness. `active` can be a test of the latest frame, for a
 * loop that should stop itself once it has run its course.
 */
const useFrameTime = (active: boolean | ((time: number) => boolean)) => {
  const [time, setTime] = useState(0)
  const on = typeof active === "function" ? active(time) : active

  useEffect(() => {
    if (!on) return
    let id = requestAnimationFrame(function loop(t) {
      setTime(t)
      id = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(id)
  }, [on])

  return time
}

/**
 * Runs `start` once, the first time `visible` turns true, unless the visitor
 * prefers reduced motion. It goes through a frame so the start time is on the
 * same clock as `useFrameTime`, and so it survives a strict-mode remount.
 */
const useStartOnView = (visible: boolean, start: (at: number) => void) => {
  const started = useRef(false)
  const latest = useRef(start)

  useEffect(() => {
    latest.current = start
  })

  useEffect(() => {
    if (!visible || started.current || prefersReducedMotion()) return
    const id = requestAnimationFrame((t) => {
      started.current = true
      latest.current(t)
    })
    return () => cancelAnimationFrame(id)
  }, [visible])
}

/* ---------- world clock ---------- */

type City = { name: string; zone: string }

const CITIES: City[] = [
  { name: "San Francisco", zone: "America/Los_Angeles" },
  { name: "New York", zone: "America/New_York" },
  { name: "Reykjavík", zone: "Atlantic/Reykjavik" },
  { name: "London", zone: "Europe/London" },
  { name: "Tokyo", zone: "Asia/Tokyo" },
  { name: "Sydney", zone: "Australia/Sydney" },
]

/** A wall-clock reading somewhere, broken into its fields. */
type WallTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const fields = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
} as const

const formatters = new Map<string, Intl.DateTimeFormat>()

/** What the clocks on the wall in `zone` read at `ms`. */
const wallTime = (ms: number, zone: string): WallTime => {
  let format = formatters.get(zone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { ...fields, timeZone: zone })
    formatters.set(zone, format)
  }
  const part = Object.fromEntries(
    format.formatToParts(ms).map((p) => [p.type, Number(p.value)])
  )
  return {
    year: part.year,
    month: part.month,
    day: part.day,
    hour: part.hour,
    minute: part.minute,
    second: part.second,
  }
}

const localWallTime = (ms: number): WallTime => {
  const d = new Date(ms)
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  }
}

/** A wall time as if it were UTC, so two of them can be subtracted. */
const asUtc = (t: WallTime) =>
  Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute)

/** How a city's clock stands against the visitor's own: "Tomorrow, +9h". */
const relativeLabel = (city: WallTime, local: WallTime) => {
  const minutes = Math.round((asUtc(city) - asUtc(local)) / 60000)
  const days = Math.round(
    (Date.UTC(city.year, city.month - 1, city.day) -
      Date.UTC(local.year, local.month - 1, local.day)) /
      86_400_000
  )
  const day = days > 0 ? "Tomorrow" : days < 0 ? "Yesterday" : "Today"
  if (minutes === 0) return `${day}, local`
  const abs = Math.abs(minutes)
  const hours = `${Math.floor(abs / 60)}h${abs % 60 ? ` ${abs % 60}m` : ""}`
  return `${day}, ${minutes > 0 ? "+" : "−"}${hours}`
}

/**
 * The Clock template, weighted up to read at a sixth of the width: the same
 * sixty and twelve ticks and clock numerals, the hour and minute hands, and a
 * sweep hand for the seconds. All three hands read one value, the hour of the
 * half day; the minute hand goes round twelve times as often and the second
 * hand seven hundred and twenty.
 */
const ClockFace = ({ time }: { time: WallTime | null }) => {
  const hours = time
    ? (time.hour % 12) + time.minute / 60 + time.second / 3600
    : 0

  return (
    <Gauge value={hours} min={0} max={12} {...ring} padding={12}>
      <GaugeTicks
        count={60}
        length={10}
        width={3}
        offset={-5}
        cap="butt"
        opacity={0.5}
      />
      <GaugeTicks count={12} length={24} width={6} offset={-12} cap="butt" />
      <GaugeTickLabels
        count={12}
        offset={-58}
        fontSize={40}
        weight="semibold"
        format={clockLabel}
      />
      {time && (
        <>
          <GaugeNeedle style="pointer" length={0.5} width={20} tail={0} />
          <GaugeNeedle
            style="pointer"
            length={0.76}
            width={13}
            tail={0}
            turns={12}
          />
          <GaugeNeedle
            style="line"
            length={0.84}
            width={4}
            tail={36}
            turns={720}
            color={MUTED}
          />
          <GaugeHub radius={13} />
        </>
      )}
    </Gauge>
  )
}

const WorldClock = ({ city, now }: { city: City; now: number | null }) => {
  const time = now === null ? null : wallTime(now, city.zone)
  const night = time !== null && (time.hour < 6 || time.hour >= 18)

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className={cn(
          "aspect-square w-full max-w-32 rounded-full border transition-colors",
          night ? "bg-muted" : "bg-background"
        )}
      >
        <ClockFace time={time} />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <span className="flex items-center justify-center gap-1 truncate text-xs font-medium">
          {time && (
            <HugeiconsIcon
              icon={night ? Moon02Icon : Sun03Icon}
              className="size-3 shrink-0 text-muted-foreground"
              aria-label={night ? "Night" : "Day"}
            />
          )}
          <span className="truncate">{city.name}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {time ? `${pad(time.hour)}:${pad(time.minute)}` : "--:--"}
        </span>
        <span className="truncate text-[11px] text-muted-foreground tabular-nums">
          {time && now !== null ? relativeLabel(time, localWallTime(now)) : " "}
        </span>
      </div>
    </div>
  )
}

/* ---------- stopwatch ---------- */

type StopwatchState = {
  /** When the current run began, on the frame clock; null while stopped. */
  startedAt: number | null
  /** Milliseconds from earlier runs, before the last stop. */
  banked: number
  /** Total elapsed at each press of Lap, oldest first. */
  laps: number[]
}

const STOPPED: StopwatchState = { startedAt: null, banked: 0, laps: [] }

/** A run already under way, so the lap list has something in it at first. */
const DEMO: StopwatchState = {
  startedAt: null,
  banked: 229_870,
  laps: [72_340, 141_870, 214_050],
}

/** 01:23.45 */
const formatSplit = (ms: number) => {
  const cs = Math.floor(ms / 10)
  return `${pad(Math.floor(cs / 6000))}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`
}

/**
 * A stopwatch face: sixty seconds round the rim with the sweep hand, and a
 * thirty-minute register inset above six, as on a mechanical chronograph.
 * The split reads out above the centre, clear of the numerals.
 * Neither follows with a transition, since both wrap back to zero and a
 * spring would send them the long way round.
 */
const StopwatchDial = ({ ms }: { ms: number }) => {
  const seconds = ms / 1000

  return (
    <Gauge value={seconds % 60} min={0} max={60} {...ring} padding={12}>
      <GaugeTicks
        count={240}
        length={8}
        width={1.5}
        offset={-4}
        cap="butt"
        opacity={0.4}
      />
      <GaugeTicks count={60} length={14} width={2.5} offset={-7} cap="butt" />
      <GaugeTicks count={12} length={22} width={4} offset={-11} cap="butt" />
      <GaugeTickLabels
        count={12}
        offset={-50}
        fontSize={28}
        weight="semibold"
        format={(v) => String(v || 60)}
      />
      <GaugeInset
        value={(seconds / 60) % 30}
        min={0}
        max={30}
        {...ring}
        y={72}
        scale={0.28}
      >
        <GaugeTrack width={6} cap="butt" opacity={0.25} offset={-3} />
        <GaugeTicks
          count={30}
          length={18}
          width={5}
          offset={-18}
          cap="butt"
          opacity={0.5}
        />
        <GaugeTicks count={6} length={34} width={9} offset={-26} cap="butt" />
        <GaugeNeedle style="pointer" length={0.78} width={30} tail={0} />
        <GaugeHub radius={22} />
      </GaugeInset>
      <GaugeText y={-72} fontSize={34} font="mono" className="tabular-nums">
        {formatSplit(ms)}
      </GaugeText>
      <GaugeNeedle
        style="line"
        length={0.92}
        width={4}
        tail={44}
        tailDot={10}
      />
      <GaugeHub radius={11} />
    </Gauge>
  )
}

const Stopwatch = ({ visible }: { visible: boolean }) => {
  const [watch, setWatch] = useState(DEMO)
  const running = watch.startedAt !== null
  const frame = useFrameTime(visible && running)

  useStartOnView(visible, (at) =>
    setWatch((w) => (w.startedAt === null ? { ...w, startedAt: at } : w))
  )

  const elapsed =
    watch.banked +
    (watch.startedAt === null ? 0 : Math.max(0, frame - watch.startedAt))

  const toggle = () => {
    const at = performance.now()
    setWatch((w) =>
      w.startedAt === null
        ? { ...w, startedAt: at }
        : { ...w, startedAt: null, banked: w.banked + (at - w.startedAt) }
    )
  }

  const lapOrReset = () => {
    const at = performance.now()
    setWatch((w) =>
      w.startedAt === null
        ? STOPPED
        : { ...w, laps: [...w.laps, w.banked + (at - w.startedAt)] }
    )
  }

  /* Newest first, each with its own time as well as the running total. */
  const laps = watch.laps
    .map((total, i) => ({
      n: i + 1,
      split: total - (watch.laps[i - 1] ?? 0),
      total,
    }))
    .reverse()
    .slice(0, 3)

  return (
    <Panel title="Stopwatch">
      <div className="mx-auto w-full max-w-56">
        <StopwatchDial ms={elapsed} />
      </div>
      <div className="flex justify-center gap-2">
        <Button
          variant="ghost-muted"
          size="xs"
          onClick={lapOrReset}
          disabled={!running && elapsed === 0}
        >
          <HugeiconsIcon
            icon={running ? Flag02Icon : RefreshIcon}
            data-icon="inline-start"
          />
          {running ? "Lap" : "Reset"}
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={toggle}
          className="min-w-16"
        >
          <HugeiconsIcon
            icon={running ? PauseIcon : PlayIcon}
            data-icon="inline-start"
          />
          {running ? "Stop" : "Start"}
        </Button>
      </div>
      {/* Three rows are always there, so a lap never moves the card. */}
      <ol className="grid grid-rows-3 divide-y divide-dashed text-xs tabular-nums">
        {[0, 1, 2].map((row) => {
          const lap = laps[row]
          return (
            <li key={row} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3">
              {lap ? (
                <>
                  <span className="text-muted-foreground">Lap {lap.n}</span>
                  <span className="font-medium">{formatSplit(lap.split)}</span>
                  <span className="text-muted-foreground">
                    {formatSplit(lap.total)}
                  </span>
                </>
              ) : (
                <span className="col-span-3 text-center text-muted-foreground/60">
                  {row === 0 && laps.length === 0 ? "No laps yet" : " "}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

/* ---------- alarms ---------- */

type Alarm = {
  id: string
  /** Hour of the day, with minutes as its fraction. */
  at: number
  label: string
  /** Days it rings on, 0 for Sunday. */
  days: number[]
  on: boolean
}

const WEEKDAYS = [1, 2, 3, 4, 5]
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const ALARMS: Alarm[] = [
  { id: "wake", at: 6.5, label: "Wake up", days: WEEKDAYS, on: true },
  { id: "run", at: 7.75, label: "Long run", days: [6], on: false },
  { id: "standup", at: 9.25, label: "Stand-up", days: WEEKDAYS, on: true },
  { id: "lights", at: 22.5, label: "Wind down", days: EVERY_DAY, on: true },
]

const repeatLabel = (days: number[]) =>
  days.length === 7
    ? "Every day"
    : days.join() === WEEKDAYS.join()
      ? "Weekdays"
      : days
          .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
          .join(", ")

/** Minutes from `now` until `alarm` next rings, looking a week ahead. */
const minutesUntil = (alarm: Alarm, now: Date) => {
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  for (let ahead = 0; ahead <= 7; ahead++) {
    if (!alarm.days.includes((now.getDay() + ahead) % 7)) continue
    const minutes = (ahead * 24 + alarm.at - hour) * 60
    if (minutes > 0) return minutes
  }
  return Infinity
}

const formatWait = (minutes: number) => {
  const m = Math.ceil(minutes)
  const days = Math.floor(m / 1440)
  const hours = Math.floor((m % 1440) / 60)
  if (days > 0) return `in ${days}d ${hours}h`
  return hours > 0 ? `in ${hours}h ${m % 60}m` : `in ${m % 60}m`
}

/**
 * A twenty-four hour dial with midnight at the top. The hand is the time now,
 * every alarm is a dot on the rim, dimmed while it is off, and the arc runs
 * from now to the next one to ring, if that falls within the day.
 */
const AlarmDial = ({
  hour,
  alarms,
  next,
}: {
  hour: number | null
  alarms: Alarm[]
  next: { alarm: Alarm; minutes: number } | null
}) => (
  <Gauge value={hour ?? 0} min={0} max={24} {...ring} padding={16}>
    <GaugeTrack width={10} cap="butt" />
    {/* From now to the next alarm, carrying on past midnight in one piece. */}
    {hour !== null && next && next.minutes <= 24 * 60 && (
      <GaugeArc
        from={hour}
        to={hour + next.minutes / 60}
        wrap
        width={10}
        cap="butt"
        color="var(--foreground)"
      />
    )}
    <GaugeTicks
      count={96}
      length={8}
      width={1.5}
      offset={-22}
      cap="butt"
      opacity={0.4}
    />
    <GaugeTicks
      count={24}
      length={12}
      width={2.5}
      offset={-24}
      cap="butt"
      opacity={0.8}
    />
    <GaugeTickLabels
      count={4}
      offset={-54}
      fontSize={24}
      weight="semibold"
      color={MUTED}
      format={(v) => pad(v)}
    />
    {alarms.map((alarm) => (
      <GaugeInset key={alarm.id} value={alarm.at} min={0} max={24} {...ring}>
        <GaugeDot
          radius={alarm.on ? 12 : 8}
          color={alarm.on ? "var(--foreground)" : MUTED}
          opacity={alarm.on ? 1 : 0.6}
        />
      </GaugeInset>
    ))}
    {hour !== null && (
      <GaugeNeedle style="line" length={0.6} width={6} tail={0} gap={80} />
    )}
    <GaugeText y={-8} fontSize={52} font="mono" weight="semibold">
      {next ? clockTime(next.alarm.at) : "--:--"}
    </GaugeText>
    <GaugeText y={38} fontSize={20} color={MUTED}>
      {next ? formatWait(next.minutes) : "No alarms"}
    </GaugeText>
  </Gauge>
)

const Alarms = ({ now }: { now: number | null }) => {
  const [alarms, setAlarms] = useState(ALARMS)
  const date = now === null ? null : new Date(now)
  const hour =
    date === null
      ? null
      : date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600

  const next =
    date === null
      ? null
      : (alarms
          .filter((a) => a.on)
          .map((alarm) => ({ alarm, minutes: minutesUntil(alarm, date) }))
          .filter((a) => Number.isFinite(a.minutes))
          .sort((a, b) => a.minutes - b.minutes)[0] ?? null)

  const toggle = (id: string, on: boolean) =>
    setAlarms((list) => list.map((a) => (a.id === id ? { ...a, on } : a)))

  return (
    <Panel title="Alarms">
      <div className="mx-auto w-full max-w-56">
        <AlarmDial hour={hour} alarms={alarms} next={next} />
      </div>
      <ul className="flex flex-col">
        {alarms.map((alarm) => (
          <li
            key={alarm.id}
            className="flex items-center gap-3 border-t py-1.5 first:border-t-0"
          >
            <span
              className={cn(
                "w-12 text-base font-medium tabular-nums transition-colors",
                !alarm.on && "text-muted-foreground"
              )}
            >
              {clockTime(alarm.at)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium">
                {alarm.label}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {repeatLabel(alarm.days)}
              </span>
            </span>
            <Switch
              size="sm"
              checked={alarm.on}
              onCheckedChange={(on) => toggle(alarm.id, on)}
              aria-label={`${alarm.label} at ${clockTime(alarm.at)}`}
            />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ---------- timers ---------- */

type Timer = {
  id: string
  label: string
  /** Full length, ms. */
  duration: number
  /** Time left as of the last pause, ms. */
  left: number
  /** When it runs out, on the frame clock; null while paused. */
  endsAt: number | null
}

const minutes = (m: number) => m * 60_000

/** Three kitchen-drawer timers, each caught partway through. */
const TIMERS: Timer[] = [
  {
    id: "tea",
    label: "Tea",
    duration: minutes(3),
    left: minutes(1.2),
    endsAt: null,
  },
  {
    id: "pasta",
    label: "Pasta",
    duration: minutes(10),
    left: minutes(6.4),
    endsAt: null,
  },
  {
    id: "focus",
    label: "Focus",
    duration: minutes(25),
    left: minutes(18 + 2 / 3),
    endsAt: null,
  },
]

const timeLeft = (timer: Timer, frame: number) =>
  timer.endsAt === null ? timer.left : Math.max(0, timer.endsAt - frame)

/** Counts down in whole seconds, as a kitchen timer does: 6:24. */
const formatCountdown = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/**
 * The Timer template: the ring of what is left inside a sixty-tick bezel, a
 * mono countdown in the middle, and the timer's name above it. When it runs
 * out the face pulses until it is reset or started again.
 */
const TimerDial = ({ timer, left }: { timer: Timer; left: number }) => {
  const done = left === 0

  return (
    <Gauge
      value={left}
      min={0}
      max={timer.duration}
      {...ring}
      padding={28}
      transition={REFILL}
      className={cn(done && "animate-pulse")}
    >
      <GaugeTrack width={8} cap="butt" />
      <GaugeArc width={8} cap="butt" />
      <GaugeTicks count={12} length={10} width={2.5} offset={18} />
      <GaugeTicks count={60} length={5} width={1.5} offset={16} opacity={0.5} />
      <GaugeText y={-68} fontSize={34} weight="semibold" color={MUTED}>
        {timer.label}
      </GaugeText>
      <GaugeText y={0} fontSize={88} font="mono" weight="regular">
        {done ? "Done" : formatCountdown(left)}
      </GaugeText>
      <GaugeText y={70} fontSize={28} font="mono" color={MUTED}>
        of {formatCountdown(timer.duration)}
      </GaugeText>
    </Gauge>
  )
}

const Timers = ({ visible }: { visible: boolean }) => {
  const [timers, setTimers] = useState(TIMERS)
  /* Frames run only while something is counting down, so a timer that has
     run out stops asking for more. */
  const frame = useFrameTime(
    (time) =>
      visible && timers.some((t) => t.endsAt !== null && t.endsAt > time)
  )

  useStartOnView(visible, (at) =>
    setTimers((list) =>
      list.map((t) => (t.endsAt === null ? { ...t, endsAt: at + t.left } : t))
    )
  )

  const update = (id: string, change: (t: Timer, at: number) => Timer) => {
    const at = performance.now()
    setTimers((list) => list.map((t) => (t.id === id ? change(t, at) : t)))
  }

  const toggle = (id: string) =>
    update(id, (t, at) => {
      if (t.endsAt !== null) {
        const left = Math.max(0, t.endsAt - at)
        /* Pausing a finished timer is resetting it. */
        return { ...t, left: left || t.duration, endsAt: null }
      }
      const left = t.left || t.duration
      return { ...t, left, endsAt: at + left }
    })

  const reset = (id: string) =>
    update(id, (t) => ({ ...t, left: t.duration, endsAt: null }))

  return (
    <Panel title="Timers">
      <div className="grid grid-cols-3 gap-4 sm:gap-10 sm:px-6">
        {timers.map((timer) => {
          const left = timeLeft(timer, frame)
          const counting = timer.endsAt !== null && left > 0
          return (
            <div key={timer.id} className="flex flex-col items-center gap-3">
              <div className="w-full max-w-44">
                <TimerDial timer={timer} left={left} />
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost-muted"
                  size="icon-xs"
                  onClick={() => reset(timer.id)}
                  disabled={!counting && left === timer.duration}
                  aria-label={`Reset ${timer.label}`}
                >
                  <HugeiconsIcon icon={RefreshIcon} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  onClick={() => toggle(timer.id)}
                  aria-label={`${counting ? "Pause" : "Start"} ${timer.label}`}
                >
                  <HugeiconsIcon icon={counting ? PauseIcon : PlayIcon} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

/* ---------- layout ---------- */

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
      {action && <CardAction>{action}</CardAction>}
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-center gap-4">
      {children}
    </CardContent>
  </Card>
)

/**
 * Everything a clock app does, on gauges: a row of world clocks from the
 * Clock template, a chronograph stopwatch, alarms on a twenty-four hour dial,
 * and a bank of countdowns from the Timer template. The clocks tell the real
 * time; the stopwatch and timers start themselves when the tab opens.
 */
export const TimeDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const visible = useInView(frame)
  const now = useNow()
  const local = now === null ? null : localWallTime(now)

  return (
    <div ref={frame} className="flex flex-col gap-4">
      <Panel
        title="World clock"
        action={
          <span className="text-xs text-muted-foreground tabular-nums">
            {local
              ? `${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)}`
              : " "}
          </span>
        }
      >
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
          {CITIES.map((city) => (
            <WorldClock key={city.zone} city={city} now={now} />
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stopwatch visible={visible} />
        <Alarms now={now} />
      </div>
      <Timers visible={visible} />
    </div>
  )
}
