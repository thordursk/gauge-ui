"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Area, AreaChart, YAxis } from "recharts"

import {
  Gauge,
  GaugeArc,
  GaugeHub,
  GaugeInset,
  GaugeMarks,
  GaugeNeedle,
  GaugeStack,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTooltip,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  type GaugeTooltipProps,
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
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

/** Every gauge sweeps up from the foot of its domain as the tab opens. */
const ARRIVE: GaugeTransition = { type: "spring", visualDuration: 1, bounce: 0 }

const MUTED = "var(--muted-foreground)"
/** The zone worth watching takes the strongest tone on the face. */
const ALERT = "var(--foreground)"
/** For the stretch of a zone band that should show only the track. */
const CLEAR = "transparent"

/* ---------- the machine ---------- */

const CORES = 8
/** GB */
const RAM = 32
const SWAP = 8
/** Mb/s, the link speed */
const LINK = 1000
/** Samples kept for the rolling charts. */
const HISTORY = 40

const VOLUMES = [
  { mount: "/", size: 512 },
  { mount: "/var/log", size: 128 },
  { mount: "/data", size: 2048 },
]

const PROCESSES = [
  { name: "postgres", pid: 1182 },
  { name: "node", pid: 2417 },
  { name: "nginx", pid: 904 },
  { name: "redis-server", pid: 1320 },
  { name: "dockerd", pid: 611 },
  { name: "prometheus", pid: 1755 },
]

/* ---------- live readings ---------- */

type Sample = {
  t: number
  user: number
  system: number
  rx: number
  tx: number
}

type Process = { name: string; pid: number; cpu: number; mem: number }

type Live = {
  /** Where the cores are drifting towards, %. */
  demand: number
  /** Busy share of each core, % */
  cores: number[]
  /** Share of the busy time spent in the kernel, 0–1 */
  kernel: number
  /** 1, 5 and 15 minute load averages */
  load: [number, number, number]
  /** GB */
  wired: number
  app: number
  cached: number
  swap: number
  /** Mb/s */
  rx: number
  tx: number
  /** MB/s */
  read: number
  write: number
  /** % used per volume */
  volumes: number[]
  processes: Process[]
  history: Sample[]
}

const mean = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length

const START_CORES = [46, 38, 61, 29, 52, 34, 44, 27]

/* A deterministic backlog, so the server render and the first client render
   agree and the charts open already full. */
const START: Live = {
  demand: 42,
  cores: START_CORES,
  kernel: 0.28,
  load: [3.1, 2.8, 2.4],
  wired: 3.4,
  app: 12.6,
  cached: 6.2,
  swap: 1.1,
  rx: 412,
  tx: 88,
  read: 142,
  write: 38,
  volumes: [64, 91, 47],
  processes: [
    { ...PROCESSES[0], cpu: 84, mem: 18.2 },
    { ...PROCESSES[1], cpu: 61, mem: 9.4 },
    { ...PROCESSES[2], cpu: 22, mem: 0.6 },
    { ...PROCESSES[3], cpu: 17, mem: 4.1 },
    { ...PROCESSES[4], cpu: 9, mem: 2.3 },
    { ...PROCESSES[5], cpu: 6, mem: 3.8 },
  ],
  history: Array.from({ length: HISTORY }, (_, i) => {
    const busy = 40 + 12 * Math.sin(i / 4) + 6 * Math.sin(i / 1.7)
    return {
      t: i,
      user: busy * 0.72,
      system: busy * 0.28,
      rx: 380 + 160 * Math.sin(i / 5) + 60 * Math.sin(i / 1.3),
      tx: 90 + 40 * Math.sin(i / 3.2),
    }
  }),
}

const clampTo = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value))

const drift = (value: number, by: number, lo: number, hi: number) =>
  clampTo(value + (Math.random() * 2 - 1) * by, lo, hi)

/** Eases a load average towards the run queue, faster for the shorter window. */
const settle = (load: number, queue: number, rate: number) =>
  load + (queue - load) * rate

const step = (l: Live): Live => {
  const demand = drift(l.demand, 8, 15, 90)
  /* Each core jitters on its own but is pulled towards the shared demand. */
  const cores = l.cores.map((c) =>
    clampTo(c + (demand - c) * 0.25 + (Math.random() * 2 - 1) * 14, 2, 100)
  )
  const kernel = drift(l.kernel, 0.04, 0.15, 0.4)
  const busy = mean(cores)
  const queue = (busy / 100) * CORES * 1.1
  const rx = drift(l.rx, 140, 30, 960)
  const tx = drift(l.tx, 45, 8, 420)
  const last = l.history[l.history.length - 1]

  return {
    demand,
    cores,
    kernel,
    load: [
      settle(l.load[0], queue, 0.3),
      settle(l.load[1], queue, 0.08),
      settle(l.load[2], queue, 0.03),
    ],
    wired: drift(l.wired, 0.05, 3.1, 3.8),
    app: drift(l.app, 0.4, 9, 17),
    cached: drift(l.cached, 0.25, 4, 8.5),
    swap: drift(l.swap, 0.06, 0.6, 2.4),
    rx,
    tx,
    read: drift(l.read, 40, 4, 480),
    write: drift(l.write, 18, 2, 220),
    volumes: l.volumes.map((v, i) =>
      drift(v, 0.08, START.volumes[i] - 0.5, START.volumes[i] + 0.5)
    ),
    processes: l.processes
      .map((p) => ({
        ...p,
        cpu: drift(p.cpu, p.cpu * 0.25 + 2, 0.1, 190),
        mem: drift(p.mem, 0.15, 0.2, 24),
      }))
      .sort((a, b) => b.cpu - a.cpu),
    history: [
      ...l.history.slice(1),
      {
        t: last.t + 1,
        user: busy * (1 - kernel),
        system: busy * kernel,
        rx,
        tx,
      },
    ],
  }
}

/**
 * Samples the machine every second and a half while the dashboard is on
 * screen, so the needles and charts keep moving like a real monitor's would.
 * Reduced motion leaves them where they start.
 */
const useLiveReadings = (visible: boolean) => {
  const [live, setLive] = useState(START)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => setLive(step), 1500)
    return () => window.clearInterval(id)
  }, [visible])

  return live
}

/* ---------- gauges ---------- */

/**
 * The small top-half dial in the stat tiles: a track split into quarters, a
 * needle, and whatever fill or zone the metric needs underneath it. Hovering
 * it brings up the reading on the arc where the needle points.
 */
const MiniDial = ({
  value,
  min = 0,
  max,
  tooltip,
  children,
}: {
  value: number
  min?: number
  max: number
  tooltip: GaugeTooltipProps
  children?: ReactNode
}) => (
  <Gauge
    value={value}
    min={min}
    max={max}
    startAngle={90}
    endAngle={270}
    fit="content"
    padding={28}
    transition={ARRIVE}
    initialValue={min}
  >
    <GaugeTrack width={40} cap="butt" />
    {children}
    {/* Notches in the card's own colour cut the band into segments. */}
    <GaugeMarks
      count={4}
      length={44}
      width={8}
      cap="butt"
      color="var(--card)"
    />
    <GaugeNeedle style="pointer" length={0.95} width={36} tail={0} />
    <GaugeHub radius={22} />
    <GaugeTooltip {...tooltip} />
  </Gauge>
)

/** Total CPU on a full dial, the busy arc split into user and kernel time. */
const CpuDial = ({ busy, kernel }: { busy: number; kernel: number }) => (
  <Gauge
    value={busy}
    max={100}
    padding={24}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={28} cap="butt" />
    <GaugeStack
      width={28}
      parts={[
        { weight: 1 - kernel, color: "var(--foreground)" },
        { weight: kernel, color: MUTED, opacity: 0.6 },
      ]}
    />
    <GaugeTicks
      count={50}
      length={6}
      width={2}
      offset={-30}
      cap="butt"
      opacity={0.4}
    />
    <GaugeTicks count={10} length={14} width={4} offset={-34} cap="butt" />
    <GaugeTickLabels count={5} offset={-66} fontSize={22} weight="semibold" />
    <GaugeValue y={-8} fontSize={88} font="mono" />
    <GaugeText y={52} fontSize={24} color={MUTED}>
      % busy
    </GaugeText>
  </Gauge>
)

/** One core: a ring that fills with its load, the reading in the middle. */
const CoreDial = ({ index, value }: { index: number; value: number }) => (
  <Gauge
    value={value}
    max={100}
    padding={20}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={32} cap="butt" />
    <GaugeZones
      zones={[
        { to: 90, color: CLEAR },
        { to: 100, color: MUTED },
      ]}
      width={10}
      offset={-30}
    />
    <GaugeArc width={32} cap="butt" />
    <GaugeValue y={-6} fontSize={80} font="mono" />
    <GaugeText y={160} fontSize={36} color={MUTED} font="mono">
      {`cpu${index}`}
    </GaugeText>
  </Gauge>
)

/**
 * Memory on a three-quarter ring, the used arc stacked from wired through app
 * to cache, with swap as a thin ring inside it.
 */
const MemoryDial = ({
  wired,
  app,
  cached,
  swap,
}: {
  wired: number
  app: number
  cached: number
  swap: number
}) => (
  <Gauge
    value={wired + app + cached}
    max={RAM}
    padding={20}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={32} cap="butt" />
    <GaugeStack
      width={32}
      parts={[
        { weight: wired, color: "var(--foreground)" },
        { weight: app, color: "var(--foreground)", opacity: 0.55 },
        { weight: cached, color: MUTED, opacity: 0.35 },
      ]}
    />
    <GaugeMarks
      count={4}
      length={36}
      width={6}
      cap="butt"
      color="var(--card)"
    />
    <GaugeInset value={swap} max={SWAP} transition={ARRIVE} initialValue={0}>
      <GaugeTrack width={10} offset={-40} cap="butt" />
      <GaugeArc width={10} offset={-40} cap="butt" color={MUTED} />
    </GaugeInset>
    <GaugeValue y={-8} fontSize={80} font="mono" decimals={1} />
    <GaugeText y={52} fontSize={24} color={MUTED}>
      {`of ${RAM} GB`}
    </GaugeText>
  </Gauge>
)

/**
 * Throughput on a half dial: the needle reads download off the scale, and an
 * inner arc fills with upload against the same link speed.
 */
const NetworkDial = ({ rx, tx }: { rx: number; tx: number }) => (
  <Gauge
    value={rx}
    max={LINK}
    startAngle={90}
    endAngle={270}
    fit="content"
    padding={52}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={14} cap="butt" />
    <GaugeArc width={14} cap="butt" opacity={0.35} />
    <GaugeInset value={tx} max={LINK} startAngle={90} endAngle={270}>
      <GaugeTrack width={14} offset={-26} cap="butt" />
      <GaugeArc width={14} offset={-26} cap="butt" color={MUTED} />
    </GaugeInset>
    <GaugeTicks count={20} length={8} width={2} offset={16} opacity={0.4} />
    <GaugeTicks count={4} length={14} width={4} offset={19} cap="butt" />
    <GaugeTickLabels
      count={4}
      offset={44}
      fontSize={22}
      weight="semibold"
      format={(v) => (v >= 1000 ? "1G" : `${v}`)}
    />
    <GaugeNeedle style="pointer" length={0.9} width={16} tail={0} />
    <GaugeHub radius={14} />
  </Gauge>
)

/** One volume's fill on a half dial, darkening once it passes 90%. */
const VolumeDial = ({ used }: { used: number }) => (
  <Gauge
    value={used}
    max={100}
    startAngle={90}
    endAngle={270}
    fit="content"
    padding={24}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={40} cap="butt" />
    <GaugeArc width={40} cap="butt" opacity={used >= 90 ? 1 : 0.35} />
    <GaugeMarks values={[90]} length={56} width={6} cap="butt" color={MUTED} />
    <GaugeValue y={-44} fontSize={76} format={(v) => `${Math.round(v)}%`} />
  </Gauge>
)

/** A process's CPU as a solid ring small enough to sit in a table row. */
const ProcessRing = ({ cpu }: { cpu: number }) => (
  <Gauge
    value={cpu}
    max={100}
    startAngle={180}
    endAngle={540}
    padding={40}
    transition={ARRIVE}
    initialValue={0}
  >
    <GaugeTrack width={80} cap="butt" opacity={0.2} />
    <GaugeArc width={80} cap="butt" />
  </Gauge>
)

/* ---------- layout ---------- */

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

/** A stat tile: label and figure on the left, a small gauge right. */
const Stat = ({
  label,
  value,
  caption,
  children,
}: {
  label: string
  value: string
  caption: ReactNode
  children: ReactNode
}) => (
  <Card size="sm" className="shadow-none">
    {/* The caption runs under the gauge too, so a narrow tile keeps it on
        one line. */}
    <CardContent className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </span>
      </div>
      <div className="w-14 pt-1 sm:w-16">{children}</div>
      <div className="col-span-2 whitespace-nowrap">
        <Caption>{caption}</Caption>
      </div>
    </CardContent>
  </Card>
)

const Panel = ({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
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

/** A legend swatch in one of the dial's tones. */
const Swatch = ({
  color,
  opacity = 1,
}: {
  color: string
  opacity?: number
}) => (
  <span
    className="size-2 shrink-0 rounded-xs"
    style={{ background: color, opacity }}
  />
)

type Row = { label: string; value: string; swatch?: ReactNode }

const Readouts = ({ rows }: { rows: Row[] }) => (
  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
    {rows.map(({ label, value, swatch }) => (
      <div key={label} className="contents">
        <dt className="flex items-center gap-2 text-muted-foreground">
          {swatch}
          {label}
        </dt>
        <dd className="text-right font-medium tabular-nums">{value}</dd>
      </div>
    ))}
  </dl>
)

const cpuConfig = {
  user: { label: "User", color: "var(--foreground)" },
  system: { label: "System", color: MUTED },
} satisfies ChartConfig

const networkConfig = {
  rx: { label: "Download", color: "var(--foreground)" },
  tx: { label: "Upload", color: MUTED },
} satisfies ChartConfig

/** A rolling chart that shifts with every sample instead of re-animating. */
const Rolling = ({
  config,
  data,
  keys,
  max,
  stacked,
  className,
}: {
  config: ChartConfig
  data: Sample[]
  keys: (keyof Sample)[]
  max: number
  stacked?: boolean
  className?: string
}) => (
  <ChartContainer
    config={config}
    className={cn("aspect-auto w-full", className)}
  >
    <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
      <YAxis hide domain={[0, max]} />
      {keys.map((key) => (
        <Area
          key={key}
          dataKey={key}
          type="monotone"
          stackId={stacked ? "a" : undefined}
          stroke={`var(--color-${key})`}
          strokeWidth={1.5}
          fill={`var(--color-${key})`}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
      ))}
    </AreaChart>
  </ChartContainer>
)

const gb = (value: number) => `${value.toFixed(1)} GB`
const pct = (value: number) => `${Math.round(value)}%`
const mbps = (value: number) => `${Math.round(value)} Mb/s`

/**
 * A server monitor built mostly from gauges: needles on the sensor tiles, a
 * CPU dial beside a ring per core, memory stacked on one ring with swap
 * inside it, network on a twin half dial, and a dial per volume, with a
 * top-style process list whose CPU sits in tiny rings.
 */
export const MonitorDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const live = useLiveReadings(useInView(frame))

  const busy = mean(live.cores)
  /* The sensors follow the load: the package warms with it, and the fan
     spins up once it passes 45 °C. */
  const temp = 34 + busy * 0.55
  const fan = Math.round((1200 + Math.max(0, temp - 45) * 110) / 10) * 10
  const used = live.wired + live.app + live.cached
  const [load1, load5, load15] = live.load

  return (
    <div ref={frame} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Load average"
          value={load1.toFixed(2)}
          caption={`${load5.toFixed(2)} · ${load15.toFixed(2)}`}
        >
          <MiniDial
            value={load1}
            max={CORES}
            tooltip={{ label: "1 min", decimals: 2, unit: `/ ${CORES}` }}
          >
            <GaugeZones
              zones={[
                { to: CORES * 0.75, color: CLEAR },
                { to: CORES, color: ALERT },
              ]}
              width={40}
            />
          </MiniDial>
        </Stat>
        <Stat
          label="CPU temp"
          value={`${Math.round(temp)} °C`}
          caption="Throttles at 95 °C"
        >
          <MiniDial
            value={temp}
            min={20}
            max={100}
            tooltip={{ label: "Package", unit: "°C" }}
          >
            <GaugeZones
              zones={[
                { to: 85, color: CLEAR },
                { to: 100, color: ALERT },
              ]}
              width={40}
            />
          </MiniDial>
        </Stat>
        <Stat
          label="Fan"
          value={fan.toLocaleString("en-US")}
          caption="rpm, max 5,000"
        >
          <MiniDial
            value={fan}
            max={5000}
            tooltip={{
              label: "Fan speed",
              unit: "rpm",
              format: (v) => Math.round(v).toLocaleString("en-US"),
            }}
          >
            <GaugeArc width={40} cap="butt" opacity={0.3} />
          </MiniDial>
        </Stat>
        <Stat label="Swap" value={gb(live.swap)} caption={`of ${SWAP} GB`}>
          <MiniDial
            value={live.swap}
            max={SWAP}
            tooltip={{ label: "Swap used", decimals: 1, unit: "GB" }}
          >
            <GaugeArc width={40} cap="butt" opacity={0.3} />
          </MiniDial>
        </Stat>

        <Panel
          title="CPU"
          description={`${CORES} cores, up 42 days`}
          action={`${Math.round(busy)}% busy`}
          className="col-span-2 sm:col-span-4"
        >
          <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center">
            <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-1">
              <div className="mx-auto w-full max-w-48">
                <CpuDial busy={busy} kernel={live.kernel} />
              </div>
              <Readouts
                rows={[
                  {
                    label: "User",
                    value: pct(busy * (1 - live.kernel)),
                    swatch: <Swatch color="var(--foreground)" />,
                  },
                  {
                    label: "System",
                    value: pct(busy * live.kernel),
                    swatch: <Swatch color={MUTED} opacity={0.6} />,
                  },
                  { label: "Idle", value: pct(100 - busy) },
                ]}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                {live.cores.map((value, i) => (
                  <CoreDial key={i} index={i} value={value} />
                ))}
              </div>
              <Rolling
                config={cpuConfig}
                data={live.history}
                keys={["system", "user"]}
                max={100}
                stacked
                className="h-16"
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Memory"
          description={`${RAM} GB, ${SWAP} GB swap`}
          action={pct((used / RAM) * 100)}
          className="col-span-2"
        >
          <div className="grid grid-cols-2 items-center gap-4">
            <MemoryDial
              wired={live.wired}
              app={live.app}
              cached={live.cached}
              swap={live.swap}
            />
            <Readouts
              rows={[
                {
                  label: "Wired",
                  value: gb(live.wired),
                  swatch: <Swatch color="var(--foreground)" />,
                },
                {
                  label: "App",
                  value: gb(live.app),
                  swatch: <Swatch color="var(--foreground)" opacity={0.55} />,
                },
                {
                  label: "Cached",
                  value: gb(live.cached),
                  swatch: <Swatch color={MUTED} opacity={0.35} />,
                },
                { label: "Free", value: gb(RAM - used) },
                {
                  label: "Swap",
                  value: gb(live.swap),
                  swatch: <Swatch color={MUTED} />,
                },
              ]}
            />
          </div>
        </Panel>

        <Panel
          title="Network"
          description="eth0, 1 Gb/s"
          action={`${Math.round(((live.rx + live.tx) / LINK) * 100)}% of link`}
          className="col-span-2"
        >
          <div className="grid grid-cols-2 items-center gap-4">
            <NetworkDial rx={live.rx} tx={live.tx} />
            <Readouts
              rows={[
                {
                  label: "Download",
                  value: mbps(live.rx),
                  swatch: <Swatch color="var(--foreground)" opacity={0.35} />,
                },
                {
                  label: "Upload",
                  value: mbps(live.tx),
                  swatch: <Swatch color={MUTED} />,
                },
                { label: "Connections", value: "1,284" },
                { label: "Dropped", value: "0" },
              ]}
            />
          </div>
          <Rolling
            config={networkConfig}
            data={live.history}
            keys={["rx", "tx"]}
            max={LINK}
            className="h-12"
          />
        </Panel>

        <Panel
          title="Disks"
          description="Mounted volumes"
          action={`R ${Math.round(live.read)} · W ${Math.round(live.write)} MB/s`}
          className="col-span-2"
        >
          <div className="grid grid-cols-3 gap-4">
            {VOLUMES.map(({ mount, size }, i) => {
              const usedPct = live.volumes[i]
              return (
                <div key={mount} className="flex flex-col items-center gap-1">
                  <VolumeDial used={usedPct} />
                  <span className="font-mono text-xs font-medium">{mount}</span>
                  <Caption>
                    {Math.round((usedPct / 100) * size)} / {size} GB
                  </Caption>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel
          title="Processes"
          description="Top by CPU"
          action="312 running"
          className="col-span-2"
        >
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="[&>th]:pb-2 [&>th]:font-normal">
                <th className="text-left">Name</th>
                <th className="text-right">PID</th>
                <th className="text-right">CPU</th>
                <th className="text-right">Mem</th>
              </tr>
            </thead>
            <tbody>
              {live.processes.map((p) => (
                <tr key={p.pid} className="[&>td]:py-1">
                  <td className="font-mono">{p.name}</td>
                  <td className="text-right text-muted-foreground">{p.pid}</td>
                  <td>
                    <span className="flex items-center justify-end gap-2">
                      {p.cpu.toFixed(1)}%
                      <span className="size-4">
                        <ProcessRing cpu={p.cpu} />
                      </span>
                    </span>
                  </td>
                  <td className="text-right">{p.mem.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  )
}
