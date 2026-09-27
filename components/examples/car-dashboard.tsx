"use client"

import { useRef, type ReactNode } from "react"

import {
  Gauge,
  GaugeArc,
  GaugeHub,
  GaugeInset,
  GaugeNeedle,
  GaugeText,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  type GaugeTransition,
} from "@/components/gauge"
import { cn } from "@/lib/utils"

import { useDriveSimulation } from "./drive-simulation"

/** Soft and without overshoot, so a dozen readings a second glide together. */
const FOLLOW: GaugeTransition = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0,
}

const MUTED = "var(--muted-foreground)"

/** Every dial fills its pod edge to edge, bar a thin margin inside the rim. */
const dial = { padding: 24, transition: FOLLOW } as const

/** Fine minor ticks, heavier majors and bold numerals inside them. */
const Scale = ({
  minor,
  major,
  labelOffset,
  labelSize,
  labelWeight,
}: {
  minor: number
  major: number
  labelOffset: number
  labelSize: number
  labelWeight: "semibold" | "bold"
}) => (
  <>
    <GaugeTicks
      count={minor}
      length={8}
      width={1.5}
      color={MUTED}
      offset={-12}
      cap="butt"
      opacity={0.6}
    />
    <GaugeTicks count={major} length={18} width={3} offset={-16} cap="butt" />
    <GaugeTickLabels
      count={major}
      offset={labelOffset}
      fontSize={labelSize}
      weight={labelWeight}
    />
  </>
)

/** A tapered pointer on a solid hub. */
const Pointer = ({ length, tail }: { length: number; tail: number }) => (
  <>
    <GaugeNeedle style="pointer" length={length} width={10} tail={tail} />
    <GaugeHub radius={12} />
  </>
)

/** The top of the scale in the foreground colour, the rest muted. */
const redline = (from: number, to: number) => [
  { to: from, color: "var(--muted)" },
  { to, color: "var(--foreground)" },
]

const Tachometer = ({ rpm }: { rpm: number }) => (
  <Gauge value={rpm} min={0} max={8} {...dial}>
    <GaugeZones zones={redline(6.5, 8)} width={10} offset={4} />
    <Scale
      minor={40}
      major={8}
      labelOffset={-52}
      labelSize={24}
      labelWeight="bold"
    />
    <Pointer length={0.88} tail={30} />
    <GaugeValue y={92} fontSize={44} font="mono" decimals={1} />
    <GaugeText y={128} fontSize={16} color={MUTED}>
      x1000 rpm
    </GaugeText>
  </Gauge>
)

/**
 * Fuel closes the speedometer's ring: same centre, same radius, filling the
 * opening left between 320 and 400 — the 40 the speed sweep started at — with
 * a few degrees clear at either end so the two arcs never touch. The sweep
 * runs clockwise, which at the foot of a dial is right to left, so the fill
 * is reversed to sit the empty end on the left and read E to F.
 */
const FuelRing = ({ fuel }: { fuel: number }) => (
  <GaugeInset
    value={fuel}
    min={0}
    max={100}
    startAngle={326}
    endAngle={394}
    transition={FOLLOW}
  >
    <GaugeTrack width={8} color="var(--muted)" opacity={1} cap="butt" />
    <GaugeArc width={8} color={MUTED} cap="butt" reverse />
    <GaugeTicks
      count={4}
      length={10}
      width={2}
      color={MUTED}
      offset={-12}
      cap="butt"
    />
    <GaugeText x={-78} y={158} fontSize={20} color={MUTED} weight="semibold">
      E
    </GaugeText>
    <GaugeText x={78} y={158} fontSize={20} color={MUTED} weight="semibold">
      F
    </GaugeText>
  </GaugeInset>
)

const Speedometer = ({ speed, fuel }: { speed: number; fuel: number }) => (
  <Gauge value={speed} min={0} max={240} {...dial}>
    <GaugeZones zones={redline(180, 240)} width={8} />
    <Scale
      minor={48}
      major={12}
      labelOffset={-54}
      labelSize={20}
      labelWeight="semibold"
    />
    <Pointer length={0.85} tail={32} />
    <GaugeValue y={56} fontSize={40} font="mono" />
    <GaugeText y={88} fontSize={16} color={MUTED}>
      km/h
    </GaugeText>
    <FuelRing fuel={fuel} />
  </Gauge>
)

/** A round instrument pod: a flat rim in the muted tone around the face. */
const Pod = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => (
  <div
    className={cn(
      "aspect-square rounded-full border bg-muted p-[2.5%]",
      className
    )}
  >
    <div className="size-full rounded-full border bg-background text-foreground">
      {children}
    </div>
  </div>
)

/**
 * A twin-dial instrument cluster: the tachometer, and the speedometer with
 * fuel closing its ring. A toy drivetrain drives every reading, so the needles
 * move together the way they would on a real drive.
 */
export const CarDashboard = () => {
  const frame = useRef<HTMLDivElement>(null)
  const drive = useDriveSimulation(frame)

  return (
    <div ref={frame} className="rounded-3xl border bg-muted p-1">
      <div className="grid grid-cols-2 gap-4 rounded-[1.3rem] border bg-background p-4 sm:gap-10 sm:px-12 sm:py-8">
        <Pod>
          <Tachometer rpm={drive.rpm} />
        </Pod>
        <Pod>
          <Speedometer speed={drive.speed} fuel={drive.fuel} />
        </Pod>
      </div>
    </div>
  )
}
