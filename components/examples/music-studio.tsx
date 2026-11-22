"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  AudioWave01Icon,
  DashboardSpeed01Icon,
  MetronomeIcon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Gauge,
  GaugeArc,
  GaugeControl,
  GaugeDot,
  GaugeHub,
  GaugeMarks,
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

const MUTED = "var(--muted-foreground)"
const CUT = "var(--card)"

const INK = "var(--foreground)"

const fade = (percent: number) => fadeColor(INK, percent)

const SWEEP = { startAngle: 40, endAngle: 320 } as const

const METER: GaugeTransition = { type: "tween", duration: 0.09, ease: "linear" }

const clampTo = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value))

const FLOOR = -48
const CEIL = 6
const FADER_STEP = 0.5
const FADER_LENGTH = 300

const SPECTRUM_FLOOR = -60

const dbText = (db: number) =>
  db <= FLOOR ? "−∞" : `${db > 0 ? "+" : ""}${db.toFixed(1)}`

const sumDb = (levels: number[], weights: number[]) => {
  const power = levels.reduce(
    (sum, db, i) => sum + 10 ** (db / 10) * (weights[i] ?? 1),
    0
  )
  return power > 0 ? 10 * Math.log10(power) : -Infinity
}

type Voice = {
  hits: number[]
  peak: number
  decay: number
  rest: number
  fill?: number[]
  alt?: number[]
  centre: number
  spread: number
}

type Channel = {
  id: string
  name: string
  gain: number
  pan: number
  mute: boolean
  solo: boolean
  voice: Voice
}

const channel = (
  id: string,
  name: string,
  gain: number,
  pan: number,
  voice: Voice
): Channel => ({ id, name, gain, pan, mute: false, solo: false, voice })

const CHANNELS: Channel[] = [
  channel("kick", "Kick", -4, 0, {
    hits: [0, 4, 8, 12],
    fill: [10, 14],
    peak: -2,
    decay: 7,
    rest: -70,
    centre: 1,
    spread: 2.5,
  }),
  channel("snare", "Snare", -6, 6, {
    hits: [4, 12],
    fill: [13, 14, 15],
    peak: -4,
    decay: 6,
    rest: -70,
    centre: 10,
    spread: 5,
  }),
  channel("hats", "Hats", -12, 28, {
    hits: [0, 2, 4, 6, 8, 10, 12, 14],
    alt: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15],
    peak: -10,
    decay: 9,
    rest: -70,
    centre: 20,
    spread: 3,
  }),
  channel("bass", "Bass", -5, 0, {
    hits: [0, 3, 6, 8, 11, 14],
    alt: [0, 3, 6, 10, 12, 13],
    peak: -6,
    decay: 2.5,
    rest: -36,
    centre: 4,
    spread: 3,
  }),
  channel("keys", "Keys", -10, -30, {
    hits: [0, 8],
    alt: [0, 6, 12],
    peak: -9,
    decay: 0.8,
    rest: -24,
    centre: 12,
    spread: 4,
  }),
  channel("vox", "Vox", -3, 0, {
    hits: [0, 2, 5, 8, 10, 13],
    alt: [1, 3, 4, 7, 9],
    peak: -5,
    decay: 1.6,
    rest: -30,
    centre: 14,
    spread: 3.5,
  }),
]

const EQ_RANGE = 12
const EQ_BANDS = [
  { label: "60", gain: 3 },
  { label: "150", gain: 1.5 },
  { label: "400", gain: -2 },
  { label: "1k", gain: -1 },
  { label: "2.4k", gain: 0 },
  { label: "6k", gain: 2 },
  { label: "10k", gain: 3.5 },
  { label: "15k", gain: 1 },
]
const SPECTRUM = EQ_BANDS.length * 3

type Dynamics = { threshold: number; ratio: number; makeup: number }

const GR_RANGE = 20

const SONG_BARS = 64
const SONG_LENGTH = 640
const VERSE = ["kick", "snare", "hats", "bass", "vox"]
const SECTIONS = [
  { at: 0, name: "Intro", plays: ["kick", "hats", "keys"] },
  { at: 8, name: "Verse", plays: VERSE },
  { at: 24, name: "Chorus", plays: CHANNELS.map((c) => c.id) },
  { at: 40, name: "Verse", plays: VERSE },
  { at: 56, name: "Outro", plays: ["hats", "keys", "vox"] },
]

const sectionAt = (bar: number) =>
  SECTIONS.findLast((section) => bar >= section.at) ?? SECTIONS[0]

const hitsIn = (voice: Voice, bar: number) =>
  bar % 4 === 3 && voice.fill
    ? [...voice.hits, ...voice.fill]
    : bar % 2 === 1 && voice.alt
      ? voice.alt
      : voice.hits

type Transport = { playing: boolean; bpm: number; bar: number; step: number }

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

const Knob = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  format,
  bipolar = false,
  small = false,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label: string
  format: (value: number) => string
  bipolar?: boolean
  small?: boolean
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
      className="w-full"
    >
      <Gauge value={value} min={min} max={max} {...SWEEP} padding={20}>
        <GaugeTicks
          count={small ? 10 : 20}
          length={10}
          width={3}
          offset={22}
          color={MUTED}
          opacity={0.45}
        />
        <GaugeTrack width={10} color={INK} opacity={0.12} />
        <GaugeArc from={bipolar ? 0 : undefined} width={10} color={INK} />
        <GaugeHub radius={156} color={fade(7)} />
        <GaugeDot radius={small ? 20 : 12} offset={-70} color={INK} />
        {!small && (
          <GaugeValue
            fontSize={60}
            font="rounded"
            weight="bold"
            format={format}
          />
        )}
      </Gauge>
    </GaugeControl>
    <Caption>{small ? format(value) : label}</Caption>
  </div>
)

const FaderCap = ({ stops, size }: { stops: number; size: number }) => (
  <>
    <GaugeTickFill
      count={stops}
      mode="nearest"
      length={0}
      litLength={size * 1.8}
      width={size}
      color={INK}
      dimColor="transparent"
    />
    <GaugeTickFill
      count={stops}
      mode="nearest"
      length={0}
      litLength={size * 1.8}
      width={2}
      cap="butt"
      color={CUT}
      dimColor="transparent"
    />
  </>
)

const Meter = () => (
  <GaugeTickFill
    count={27}
    length={8}
    width={7}
    cap="butt"
    color={INK}
    dimColor={fade(9)}
  />
)

const Fader = ({
  value,
  onChange,
  label,
  meters,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  meters: number[]
}) => (
  <GaugeControl
    value={value}
    onChange={onChange}
    orientation="vertical"
    length={FADER_LENGTH}
    min={FLOOR}
    max={CEIL}
    step={FADER_STEP}
    label={label}
    valueText={`${dbText(value)} dB`}
    className="h-44 w-fit"
  >
    <LinearGauge
      value={value}
      min={FLOOR}
      max={CEIL}
      orientation="vertical"
      length={FADER_LENGTH}
      padding={{
        top: 18,
        bottom: 18,
        left: 40,
        right: 26 + meters.length * 14,
      }}
    >
      <GaugeTicks
        count={9}
        offset={28}
        length={8}
        width={2}
        color={MUTED}
        opacity={0.5}
      />
      <GaugeMarks values={[0]} offset={28} length={16} width={3} color={INK} />
      <GaugeTrack width={6} color={INK} opacity={0.12} />
      {meters.map((db, i) => (
        <LinearGaugeInset
          key={i}
          value={db}
          min={FLOOR}
          max={CEIL}
          orientation="vertical"
          length={FADER_LENGTH}
          x={30 + i * 14}
          transition={METER}
        >
          <Meter />
        </LinearGaugeInset>
      ))}
      <FaderCap stops={(CEIL - FLOOR) / FADER_STEP} size={16} />
    </LinearGauge>
  </GaugeControl>
)

const EqFader = ({
  band,
  gain,
  onChange,
}: {
  band: string
  gain: number
  onChange: (gain: number) => void
}) => (
  <div className="flex flex-col items-center gap-1">
    <GaugeControl
      value={gain}
      onChange={onChange}
      orientation="vertical"
      length={200}
      min={-EQ_RANGE}
      max={EQ_RANGE}
      step={FADER_STEP}
      label={`${band} Hz`}
      valueText={`${dbText(gain)} dB`}
      className="h-28 w-fit"
    >
      <LinearGauge
        value={gain}
        min={-EQ_RANGE}
        max={EQ_RANGE}
        orientation="vertical"
        length={200}
        padding={{ top: 14, bottom: 14, left: 22, right: 22 }}
      >
        <GaugeMarks
          values={[0]}
          length={14}
          width={2}
          color={MUTED}
          opacity={0.5}
        />
        <GaugeTrack width={4} color={INK} opacity={0.12} />
        <GaugeArc from={0} width={4} color={INK} cap="butt" />
        <FaderCap stops={(2 * EQ_RANGE) / FADER_STEP} size={12} />
      </LinearGauge>
    </GaugeControl>
    <span className="text-[10px] text-muted-foreground tabular-nums">
      {band}
    </span>
  </div>
)

const tierShade = (db: number) =>
  db < -48 ? fade(35) : db < -18 ? fade(65) : INK

const SpectrumBand = ({ db }: { db: number }) => (
  <LinearGauge
    value={db}
    min={SPECTRUM_FLOOR}
    max={0}
    orientation="vertical"
    length={200}
    transition={METER}
    padding={{ top: 4, bottom: 4, left: 14, right: 14 }}
    className="min-h-0 flex-1"
  >
    <GaugeTickFill
      count={20}
      length={26}
      width={6}
      cap="butt"
      color={tierShade}
      dimColor={fade(8)}
    />
  </LinearGauge>
)

const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-xs text-muted-foreground tabular-nums">{children}</span>
)

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

const Latch = ({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) => (
  <Button
    variant={on ? "default" : "ghost-muted"}
    size="xs"
    aria-pressed={on}
    aria-label={label}
    onClick={onClick}
    className="w-6 px-0"
  >
    {children}
  </Button>
)

const panText = (pan: number) =>
  pan === 0 ? "C" : pan < 0 ? `L${-pan}` : `R${pan}`

const Mixer = ({
  channels,
  levels,
  master,
  bus,
  onChannel,
  onMaster,
}: {
  channels: Channel[]
  levels: number[]
  master: number
  bus: [number, number]
  onChannel: (id: string, change: Partial<Channel>) => void
  onMaster: (gain: number) => void
}) => (
  <Panel
    heading={<span className="text-sm font-semibold">Mixer</span>}
    action="6 channels · 48 kHz"
    className="sm:col-span-2"
  >
    <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-7">
      {channels.map((c, i) => (
        <div key={c.id} className="flex flex-col items-center gap-3">
          <span className="text-xs font-semibold">{c.name}</span>
          <div className="w-12">
            <Knob
              value={c.pan}
              onChange={(pan) => onChannel(c.id, { pan })}
              min={-50}
              max={50}
              label={`${c.name} pan`}
              format={panText}
              bipolar
              small
            />
          </div>
          <Fader
            value={c.gain}
            onChange={(gain) => onChannel(c.id, { gain })}
            label={`${c.name} level`}
            meters={[levels[i]]}
          />
          <Caption>{dbText(c.gain)}</Caption>
          <div className="flex gap-1">
            <Latch
              on={c.mute}
              label={`Mute ${c.name}`}
              onClick={() => onChannel(c.id, { mute: !c.mute })}
            >
              M
            </Latch>
            <Latch
              on={c.solo}
              label={`Solo ${c.name}`}
              onClick={() => onChannel(c.id, { solo: !c.solo })}
            >
              S
            </Latch>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center gap-3 sm:border-l">
        <span className="text-xs font-semibold">Master</span>
        <div className="flex w-12 flex-col items-center gap-1.5">
          <div className="aspect-square w-full" />
          <Caption>L · R</Caption>
        </div>
        <Fader
          value={master}
          onChange={onMaster}
          label="Master level"
          meters={bus}
        />
        <Caption>{dbText(master)}</Caption>
        <div className="h-6" />
      </div>
    </div>
  </Panel>
)

const Equaliser = ({
  gains,
  spectrum,
  onGain,
}: {
  gains: number[]
  spectrum: number[]
  onGain: (band: number, gain: number) => void
}) => (
  <Panel
    heading={<Category icon={AudioWave01Icon}>Equaliser</Category>}
    action="Master bus"
  >
    <div className="flex h-24 justify-between">
      {spectrum.map((db, i) => (
        <div key={i} className="flex h-full min-w-0 flex-1 flex-col">
          <SpectrumBand db={db} />
        </div>
      ))}
    </div>
    <div className="flex justify-between">
      {EQ_BANDS.map((band, i) => (
        <EqFader
          key={band.label}
          band={band.label}
          gain={gains[i]}
          onChange={(gain) => onGain(i, gain)}
        />
      ))}
    </div>
  </Panel>
)

const DynamicsPanel = ({
  dynamics,
  reduction,
  onChange,
}: {
  dynamics: Dynamics
  reduction: number
  onChange: (change: Partial<Dynamics>) => void
}) => (
  <Panel
    heading={<Category icon={DashboardSpeed01Icon}>Dynamics</Category>}
    action="Bus compressor"
  >
    <div className="grid grid-cols-3 gap-4">
      <Knob
        value={dynamics.threshold}
        onChange={(threshold) => onChange({ threshold })}
        min={-30}
        max={0}
        label="Threshold"
        format={(v) => `${v}`}
      />
      <Knob
        value={dynamics.ratio}
        onChange={(ratio) => onChange({ ratio })}
        min={1}
        max={10}
        step={0.5}
        label="Ratio"
        format={(v) => `${v}:1`}
      />
      <Knob
        value={dynamics.makeup}
        onChange={(makeup) => onChange({ makeup })}
        min={0}
        max={12}
        step={0.5}
        label="Makeup"
        format={(v) => `+${v}`}
      />
    </div>
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Caption>Gain reduction</Caption>
        <Figure
          value={reduction > 0.05 ? `−${reduction.toFixed(1)}` : "0.0"}
          unit="dB"
          className="text-lg"
        />
      </div>
      <LinearGauge
        value={-reduction}
        min={-GR_RANGE}
        max={0}
        transition={METER}
        padding={{ top: 12, bottom: 36, left: 10, right: 10 }}
      >
        <GaugeTrack width={12} color={INK} opacity={0.12} cap="butt" />
        <GaugeArc from={0} width={12} color={INK} cap="butt" />
        <GaugeTicks count={20} offset={-14} length={4} color={MUTED} />
        <GaugeTickLabels
          count={4}
          offset={-30}
          fontSize={14}
          color={MUTED}
          format={(v) => `${v}`}
        />
      </LinearGauge>
    </div>
  </Panel>
)

const TransportPanel = ({
  transport,
  onChange,
}: {
  transport: Transport
  onChange: (change: Partial<Transport>) => void
}) => {
  const { bar, step, playing, bpm } = transport
  const section = sectionAt(bar)
  return (
    <Panel
      heading={<Category icon={MetronomeIcon}>Transport</Category>}
      action="4/4"
      className="sm:col-span-2"
    >
      <div className="grid items-center gap-6 sm:grid-cols-[9rem_1fr]">
        <div className="mx-auto w-36">
          <Knob
            value={bpm}
            onChange={(bpm) => onChange({ bpm })}
            min={60}
            max={180}
            label="Tempo · BPM"
            format={(v) => `${v}`}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <Figure
                value={`${bar + 1}.${Math.floor(step / 4) + 1}.${(step % 4) + 1}`}
              />
              <Caption>{section.name}</Caption>
            </div>
            <Button
              variant="secondary"
              size="icon"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => onChange({ playing: !playing })}
            >
              <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />
            </Button>
          </div>
          <LinearGauge
            value={step}
            max={15}
            padding={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <GaugeTickFill
              count={15}
              mode="nearest"
              length={0}
              width={16}
              color={INK}
              dimColor={(v) => (Math.round(v) % 4 === 0 ? fade(32) : fade(12))}
            />
          </LinearGauge>
          <LinearGauge
            value={bar + step / 16}
            max={SONG_BARS}
            length={SONG_LENGTH}
            padding={{ top: 12, bottom: 34, left: 4, right: 4 }}
          >
            <GaugeTrack width={6} color={INK} opacity={0.12} />
            <GaugeArc width={6} color={INK} />
            <GaugeMarks
              values={SECTIONS.slice(1).map((s) => s.at)}
              length={16}
              width={2}
              color={MUTED}
            />
            {SECTIONS.map((s) => (
              <GaugeText
                key={s.at}
                x={
                  (s.at / SONG_BARS - 0.5) * SONG_LENGTH + (s.at === 0 ? 0 : 6)
                }
                y={24}
                anchor="start"
                fontSize={12}
                color={MUTED}
              >
                {s.name}
              </GaugeText>
            ))}
          </LinearGauge>
        </div>
      </div>
    </Panel>
  )
}

export const MusicStudio = () => {
  const frame = useRef<HTMLDivElement>(null)
  const visible = useInView(frame)

  const [channels, setChannels] = useState(CHANNELS)
  const [master, setMaster] = useState(-8)
  const [eq, setEq] = useState(() => EQ_BANDS.map((b) => b.gain))
  const [dynamics, setDynamics] = useState<Dynamics>({
    threshold: -18,
    ratio: 3,
    makeup: 4,
  })
  const [transport, setTransport] = useState<Transport>({
    playing: true,
    bpm: 124,
    bar: 21,
    step: 15,
  })
  const [voices, setVoices] = useState(() => CHANNELS.map((c) => c.voice.rest))
  const [air, setAir] = useState<number[]>(() => Array(SPECTRUM).fill(0))

  useInterval(
    () => {
      const step = (transport.step + 1) % 16
      const bar = step === 0 ? (transport.bar + 1) % SONG_BARS : transport.bar
      const { plays } = sectionAt(bar)
      setTransport((t) => ({ ...t, step, bar }))
      setVoices((vs) =>
        vs.map((v, i) => {
          const { id, voice } = CHANNELS[i]
          if (!plays.includes(id) || !hitsIn(voice, bar).includes(step)) {
            return v
          }
          const accent = step % 4 === 0 ? 1.5 : 0
          return voice.peak + accent - Math.random() * 6
        })
      )
    },
    60000 / transport.bpm / 4,
    visible && transport.playing
  )

  useInterval(
    () => {
      const { plays } = sectionAt(transport.bar)
      setVoices((vs) =>
        vs.map((v, i) => {
          const { id, voice } = CHANNELS[i]
          const sounding = transport.playing && plays.includes(id)
          return Math.max(
            sounding ? voice.rest : -90,
            v - voice.decay * (sounding ? 1 : 3)
          )
        })
      )
      setAir((a) => a.map((v) => v * 0.7 + (Math.random() * 2 - 1) * 8))
    },
    80,
    visible
  )

  const soloing = channels.some((c) => c.solo)
  const post = channels.map((c, i) =>
    !c.mute && (!soloing || c.solo) ? voices[i] + c.gain : -Infinity
  )
  const left = sumDb(
    post,
    channels.map((c) => Math.min(1, (50 - c.pan) / 50))
  )
  const right = sumDb(
    post,
    channels.map((c) => Math.min(1, (50 + c.pan) / 50))
  )

  const input = Math.max(left, right)
  const reduction = clampTo(
    input > dynamics.threshold
      ? (input - dynamics.threshold) * (1 - 1 / dynamics.ratio)
      : 0,
    0,
    GR_RANGE
  )
  const out = (db: number) =>
    clampTo(db - reduction + dynamics.makeup + master, FLOOR, CEIL)

  const spectrum = air.map((drift, band) => {
    const heard = post.map((db, i) => {
      const { centre, spread, peak } = channels[i].voice
      return (
        db + 0.8 * (voices[i] - peak) - 14 * ((band - centre) / spread) ** 2
      )
    })
    const db =
      sumDb(heard, []) +
      6 -
      reduction +
      dynamics.makeup +
      master +
      eq[Math.floor(band / 3)] +
      drift
    return clampTo(db, SPECTRUM_FLOOR, 0)
  })

  const changeChannel = (id: string, change: Partial<Channel>) =>
    setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, ...change } : c)))

  return (
    <div ref={frame} className="grid gap-3 sm:grid-cols-2">
      <Mixer
        channels={channels}
        levels={post.map((db) => clampTo(db, FLOOR, CEIL))}
        master={master}
        bus={[out(left), out(right)]}
        onChannel={changeChannel}
        onMaster={setMaster}
      />
      <Equaliser
        gains={eq}
        spectrum={spectrum}
        onGain={(band, gain) =>
          setEq((gs) => gs.map((g, i) => (i === band ? gain : g)))
        }
      />
      <DynamicsPanel
        dynamics={dynamics}
        reduction={reduction}
        onChange={(change) => setDynamics((d) => ({ ...d, ...change }))}
      />
      <TransportPanel
        transport={transport}
        onChange={(change) => setTransport((t) => ({ ...t, ...change }))}
      />
    </div>
  )
}
