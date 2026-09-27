"use client"

import { useId, useRef, type ReactNode } from "react"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeHub,
  GaugeInset,
  GaugeMarks,
  GaugeNeedle,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  polar,
  useAnimatedValue,
  useGauge,
  type GaugeTransition,
} from "@/components/gauge"

import { useFlightSimulation } from "./flight-simulation"

/** Soft and without overshoot, so a dozen readings a second glide together. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"

/** Every dial fills its pod edge to edge, bar a thin margin inside the rim. */
const dial = { padding: 24, transition: FOLLOW } as const

/** Fine minor ticks, heavier majors and numerals inside them. */
const Scale = ({
  minor,
  major,
  labels = major,
  labelSize = 30,
  format,
}: {
  minor: number
  major: number
  labels?: number
  /** Three-digit numerals need a smaller size to clear the ticks. */
  labelSize?: number
  format?: (value: number) => string
}) => (
  <>
    <GaugeTicks
      count={minor}
      length={10}
      width={1.5}
      offset={-5}
      cap="butt"
      opacity={0.5}
    />
    <GaugeTicks count={major} length={20} width={3} offset={-10} cap="butt" />
    <GaugeTickLabels
      count={labels}
      offset={-46}
      fontSize={labelSize}
      format={format}
    />
  </>
)

const Caption = ({ y, children }: { y: number; children: ReactNode }) => (
  <GaugeText y={y} fontSize={18} color={MUTED} className="tracking-widest">
    {children}
  </GaugeText>
)

/** A slim needle on a small pivot, capped in the face colour. */
const Pointer = () => (
  <>
    <GaugeNeedle style="line" length={0.88} width={5} tail={28} />
    <GaugeHub radius={14} />
    <GaugeHub radius={5} color="var(--background)" />
  </>
)

/**
 * Airspeed in knots, with the operating ranges banded under the scale: the
 * flap range inside, normal operation, the caution range, and the never
 * exceed speed as a heavy line. The gap at the top is where the sweep wraps.
 */
const AirspeedIndicator = ({ airspeed }: { airspeed: number }) => (
  <Gauge
    value={airspeed}
    min={40}
    max={200}
    startAngle={200}
    endAngle={520}
    {...dial}
  >
    <GaugeArc
      from={40}
      to={85}
      width={4}
      offset={-15}
      opacity={0.5}
      cap="butt"
    />
    <GaugeArc
      from={50}
      to={130}
      width={10}
      offset={-5}
      opacity={0.15}
      cap="butt"
    />
    <GaugeArc
      from={130}
      to={165}
      width={10}
      offset={-5}
      opacity={0.35}
      cap="butt"
    />
    <GaugeMarks values={[165]} length={24} width={4} offset={-12} cap="butt" />
    <Scale minor={32} major={8} labelSize={24} />
    <Caption y={-72}>KNOTS</Caption>
    <Pointer />
  </Gauge>
)

/** Pixels of horizon travel per degree of pitch. */
const PITCH_SCALE = 5
const HORIZON_RADIUS = 172

/**
 * The horizon behind the aircraft symbol: ground below a line, and a pitch
 * ladder every five degrees, rolled by the gauge's (animated) value and
 * shifted by the pitch. It reads the roll from the gauge so the bank pointer
 * and the horizon can never disagree.
 */
const Horizon = ({ pitch }: { pitch: number }) => {
  const { value: roll } = useGauge()
  const shown = useAnimatedValue(pitch, FOLLOW, 40)
  const clipId = `horizon${useId().replace(/\W/g, "")}`

  return (
    <g clipPath={`url(#${clipId})`}>
      <clipPath id={clipId}>
        <circle r={HORIZON_RADIUS} />
      </clipPath>
      <g transform={`rotate(${roll}) translate(0 ${shown * PITCH_SCALE})`}>
        <rect
          x={-300}
          y={0}
          width={600}
          height={400}
          fill="currentColor"
          opacity={0.1}
        />
        <line x1={-300} x2={300} stroke="currentColor" strokeWidth={2} />
        {[-20, -15, -10, -5, 5, 10, 15, 20].map((p) => {
          const half = p % 10 === 0 ? 44 : 18
          const y = -p * PITCH_SCALE
          return (
            <g key={p}>
              <line
                x1={-half}
                x2={half}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.6}
                strokeWidth={2}
              />
              {p % 10 === 0 && (
                <GaugeText x={-half - 20} y={y} fontSize={16} color={MUTED}>
                  {Math.abs(p)}
                </GaugeText>
              )}
            </g>
          )
        })}
      </g>
    </g>
  )
}

/**
 * Pitch and bank. The bank scale is fixed to the case along the top; the
 * horizon and the dot riding inside the scale roll against it, and the
 * aircraft symbol stays level in front of them all.
 */
const AttitudeIndicator = ({
  bank,
  pitch,
}: {
  bank: number
  pitch: number
}) => (
  /* The value is the roll of the horizon, which turns the opposite way to
     the aircraft, and the domain puts zero straight up. */
  <Gauge
    value={-bank}
    min={-90}
    max={90}
    startAngle={90}
    endAngle={270}
    {...dial}
  >
    <Horizon pitch={pitch} />
    <GaugeMarks
      values={[-60, -30, 30, 60]}
      length={22}
      width={3}
      offset={-12}
      cap="butt"
    />
    <GaugeMarks
      values={[-45, -20, -10, 10, 20, 45]}
      length={12}
      width={2}
      offset={-17}
      cap="butt"
    />
    <GaugeMarks values={[0]} length={22} width={6} offset={-12} cap="butt" />
    <GaugeDot radius={6} offset={-38} />
    <g stroke="currentColor" strokeWidth={6} strokeLinecap="round">
      <line x1={-112} x2={-44} />
      <line x1={44} x2={112} />
    </g>
    <GaugeHub radius={7} />
  </Gauge>
)

/**
 * Two dials on one needle: thousands on the short hand and hundreds on the
 * long one, which goes round ten times for the short hand's once.
 */
const Altimeter = ({ altitude }: { altitude: number }) => (
  <Gauge
    value={altitude}
    min={0}
    max={10000}
    startAngle={180}
    endAngle={540}
    {...dial}
  >
    <Scale minor={50} major={10} format={(v) => String(v / 1000)} />
    <Caption y={-72}>ALT</Caption>
    {/* The pressure setting, in a window at three o'clock. */}
    <GaugeText x={96} fontSize={18} color={MUTED} className="tabular-nums">
      29.92
    </GaugeText>
    <GaugeNeedle style="pointer" length={0.55} width={16} tail={0} />
    <GaugeNeedle style="line" length={0.88} width={5} tail={28} turns={10} />
    <GaugeHub radius={14} />
    <GaugeHub radius={5} color="var(--background)" />
  </Gauge>
)

/** Where a wing tip sits for a turn of `rate`: level is nine o'clock. */
const LEFT_WING = { startAngle: 60, endAngle: 120 }
const RIGHT_WING = { startAngle: 240, endAngle: 300 }
/** The tail fin, straight up when the wings are level. */
const FIN = { startAngle: 150, endAngle: 210 }

const TURN = { min: -1.5, max: 1.5, transition: FOLLOW } as const

/**
 * One side of the rate scale: graduations every half rate, the sector from
 * wings level down to a standard-rate turn shaded, and heavy marks at both
 * ends of it.
 */
const TurnScale = ({ standard }: { standard: number }) => (
  <>
    <GaugeArc
      from={Math.min(0, standard)}
      to={Math.max(0, standard)}
      width={10}
      offset={-5}
      opacity={0.15}
      cap="butt"
    />
    <GaugeTicks
      count={6}
      length={10}
      width={1.5}
      offset={-5}
      cap="butt"
      opacity={0.5}
    />
    <GaugeMarks
      values={[0, standard]}
      length={22}
      width={4}
      offset={-12}
      cap="butt"
    />
  </>
)

/**
 * Rate of turn and the slip ball. The aircraft is drawn from behind: two
 * tapered wings and a fin, each a needle on its own dial sharing one value,
 * so together they bank as one symbol; the marks are wings level and a
 * standard-rate turn each way. The ball rides a glass tube at the foot.
 */
const TurnCoordinator = ({ rate, slip }: { rate: number; slip: number }) => {
  const label = (angle: number) => polar(180, angle)
  const l = label(56)
  const r = label(304)
  const wing = <GaugeNeedle style="pointer" length={0.7} width={12} tail={0} />

  return (
    <Gauge value={rate} {...TURN} {...LEFT_WING} {...dial}>
      <TurnScale standard={-1} />
      <GaugeInset value={rate} {...TURN} {...RIGHT_WING}>
        <TurnScale standard={1} />
      </GaugeInset>
      <GaugeText x={l.x} y={l.y} fontSize={22}>
        L
      </GaugeText>
      <GaugeText x={r.x} y={r.y} fontSize={22}>
        R
      </GaugeText>
      <Caption y={-112}>TURN COORDINATOR</Caption>
      <GaugeText y={-78} fontSize={16} weight="semibold">
        2 MIN
      </GaugeText>
      {/* Clockwise runs right to left along the bottom, so the ball is fed
          the slip reversed to swing the way it would. */}
      <GaugeInset
        value={-slip}
        min={-1}
        max={1}
        radius={120}
        startAngle={338}
        endAngle={382}
        transition={FOLLOW}
      >
        <GaugeTrack width={28} opacity={0.12} />
        <GaugeTrack width={1.5} offset={-14} opacity={0.4} />
        <GaugeTrack width={1.5} offset={14} opacity={0.4} />
        <GaugeMarks values={[-0.3, 0.3]} length={28} width={2} opacity={0.6} />
        <GaugeDot radius={11} />
      </GaugeInset>
      {["NO PITCH", "INFORMATION"].map((line, i) => (
        <GaugeText
          key={line}
          y={160 + i * 17}
          fontSize={13}
          color={MUTED}
          className="tracking-widest"
        >
          {line}
        </GaugeText>
      ))}
      {wing}
      <GaugeInset value={rate} {...TURN} {...RIGHT_WING}>
        {wing}
      </GaugeInset>
      <GaugeInset value={rate} {...TURN} {...FIN}>
        <GaugeNeedle style="line" length={0.17} width={6} tail={0} />
      </GaugeInset>
      <GaugeHub radius={16} />
      <GaugeHub radius={6} color="var(--background)" />
    </Gauge>
  )
}

const cardinal = ["N", "E", "S", "W"]

/**
 * The compass card turns under a fixed lubber line, so the heading is always
 * read at the top. The card is the whole gauge turned by `rotate`, which the
 * transition swings the short way round; a fixed inset over it carries the
 * lubber line and the case marks, and the autopilot's heading bug rides the
 * card.
 */
const HeadingIndicator = ({
  heading,
  target,
}: {
  heading: number
  target: number
}) => {
  const wrap = (deg: number) => ((deg % 360) + 360) % 360

  return (
    <Gauge
      value={0}
      min={0}
      max={360}
      startAngle={180}
      endAngle={540}
      rotate={-heading}
      transition={FOLLOW}
      padding={24}
    >
      <GaugeMarks
        values={[wrap(target)]}
        length={14}
        width={12}
        offset={-7}

        cap="butt"
      />
      <Scale
        minor={72}
        major={36}
        labels={12}
        format={(v) => (v % 90 === 0 ? cardinal[v / 90] : String(v / 10))}
      />
      <GaugeInset value={0} min={0} max={360} startAngle={180} endAngle={540}>
        <GaugeMarks values={[0]} length={12} width={5} offset={14} cap="butt" />
        <GaugeMarks
          values={[45, 90, 135, 225, 270, 315]}
          length={8}
          width={3}
          offset={12}
          cap="butt"
        />
      </GaugeInset>
      <Caption y={-44}>HDG</Caption>
      <GaugeText y={4} fontSize={48} weight="regular" className="tabular-nums">
        {`${String(Math.round(wrap(heading)) % 360).padStart(3, "0")}°`}
      </GaugeText>
    </Gauge>
  )
}

/**
 * Climb and descent in hundreds of feet a minute, level at nine o'clock and
 * reading up over the top for a climb and down under it for a descent. The
 * two halves meet at a single 20 at three o'clock, and level is a heavy
 * index rather than a numeral, since the needle rests on it.
 */
const VerticalSpeedIndicator = ({
  verticalSpeed,
}: {
  verticalSpeed: number
}) => (
  <Gauge
    value={verticalSpeed / 1000}
    min={-2}
    max={2}
    startAngle={-90}
    endAngle={270}
    {...dial}
  >
    <Scale
      minor={40}
      major={8}
      format={(v) => (v === 0 ? "" : String(Math.abs(v) * 10))}
    />
    <GaugeMarks values={[0]} length={34} width={5} offset={-17} cap="butt" />
    <GaugeText x={-104} y={-44} fontSize={18} color={MUTED}>
      UP
    </GaugeText>
    <GaugeText x={-104} y={44} fontSize={18} color={MUTED}>
      DN
    </GaugeText>
    <Caption y={72}>FT/MIN</Caption>
    <Pointer />
  </Gauge>
)

/** A round instrument in a flat rim, set into the panel. */
const Pod = ({ children }: { children: ReactNode }) => (
  <div className="aspect-square rounded-full border bg-muted p-[2.5%]">
    <div className="size-full rounded-full border bg-background text-foreground">
      {children}
    </div>
  </div>
)

/**
 * The six-pack of a light aircraft: airspeed, attitude and altitude across
 * the top, turn, heading and vertical speed beneath. A toy autopilot flies
 * to a new altitude or heading every so often, so every instrument moves
 * together the way it would in the air.
 */
export const Cockpit = () => {
  const frame = useRef<HTMLDivElement>(null)
  const flight = useFlightSimulation(frame)

  return (
    <div ref={frame} className="rounded-3xl border bg-muted p-1">
      <div className="rounded-[1.3rem] border bg-background px-4 py-4 sm:px-8 sm:py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          <Pod>
            <AirspeedIndicator airspeed={flight.airspeed} />
          </Pod>
          <Pod>
            <AttitudeIndicator bank={flight.bank} pitch={flight.pitch} />
          </Pod>
          <Pod>
            <Altimeter altitude={flight.altitude} />
          </Pod>
          <Pod>
            <TurnCoordinator rate={flight.turnRate} slip={flight.slip} />
          </Pod>
          <Pod>
            <HeadingIndicator
              heading={flight.heading}
              target={flight.targetHeading}
            />
          </Pod>
          <Pod>
            <VerticalSpeedIndicator verticalSpeed={flight.verticalSpeed} />
          </Pod>
        </div>
      </div>
    </div>
  )
}
