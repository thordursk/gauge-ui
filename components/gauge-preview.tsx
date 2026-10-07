"use client"

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
  GaugeTooltip,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  clockLabel,
  compassLabel,
  zoneColor,
  zoneCutoffs,
  type GaugeTransition,
} from "@/components/gauge"
import type { GaugeSpec } from "@/lib/gauge-spec"

type GaugePreviewProps = {
  spec: GaugeSpec
  value: number
  /** Overrides the spec's transition, for play modes that drive their own. */
  transition?: GaugeTransition | boolean
  /**
   * Start every gauge in the composition at the bottom of its own domain and
   * let it animate up to the value it was given, so a whole composition
   * arrives with some movement in it rather than snapping into place. Each
   * gauge reads it once, as it mounts, so playing it again takes a remount.
   *
   * Nothing to do with the `sweep` play mode, which drives one value back and
   * forth for as long as it is on.
   */
  sweepIn?: boolean
  /**
   * Whether a tooltip in the spec shows on hover. Thumbnails turn it off, so
   * pointing at a card in a picker does not bring one up over the picker.
   */
  tooltips?: boolean
}

/**
 * How far round a wrapping part is let travel as its gauge is played in. Well
 * under half a turn, so it arrives from near where it settles rather than
 * spinning across the dial to get there.
 */
const SWEEP_TURNS = 0.4

/**
 * Where a gauge starts when it is played in: the foot of its domain, so the
 * arc fills and the needle swings up from the bottom.
 *
 * Except that a part turning more than once over the domain would have to
 * spin all those times to get there, so a gauge carrying one is started
 * within reach instead — a clock's minute hand comes round a part of the way
 * rather than twelve times over. Nothing wrapping means nothing to rein in,
 * and the run stays the whole domain.
 */
const sweepFrom = (spec: GaugeSpec, value: number) => {
  const { min, max } = spec.domain
  const span = max - min
  const turns = Math.max(
    1,
    ...(spec.needles.show ? spec.needles.list.map((n) => n.turns) : []),
    ...(spec.dot.show ? [spec.dot.turns] : [])
  )
  const reach = turns > 1 ? (span / turns) * SWEEP_TURNS : span
  return Math.max(min, value - reach)
}

/**
 * Renders a `GaugeSpec` with the gauge primitives. The generated code in
 * `lib/gauge-code.ts` mirrors this composition, so keep the two in step.
 */
export const GaugePreview = ({
  spec,
  value,
  transition = spec.transition,
  sweepIn = false,
  tooltips = true,
}: GaugePreviewProps) => {
  const { domain } = spec

  return (
    <Gauge
      value={value}
      min={domain.min}
      max={domain.max}
      startAngle={domain.startAngle}
      endAngle={domain.endAngle}
      radius={domain.radius}
      padding={domain.padding}
      fit={domain.fit}
      transition={transition}
      initialValue={sweepIn ? sweepFrom(spec, value) : undefined}
    >
      <GaugeParts spec={spec} value={value} tooltips={tooltips} />
      {spec.insets?.map((inset) => (
        <GaugeInset
          key={inset.name}
          x={inset.x}
          y={inset.y}
          scale={inset.scale}
          value={inset.value}
          min={inset.spec.domain.min}
          max={inset.spec.domain.max}
          startAngle={inset.spec.domain.startAngle}
          endAngle={inset.spec.domain.endAngle}
          radius={inset.spec.domain.radius}
          transition={inset.spec.transition}
          initialValue={
            sweepIn ? sweepFrom(inset.spec, inset.value) : undefined
          }
        >
          <GaugeParts
            spec={inset.spec}
            value={inset.value}
            tooltips={tooltips}
          />
        </GaugeInset>
      ))}
    </Gauge>
  )
}

/**
 * Everything a spec draws inside its own gauge root, so an inset renders the
 * same way the host does. `value` is only needed for the zone the arc takes
 * its colour from; the parts themselves read the animated value from context.
 */
const GaugeParts = ({
  spec,
  value,
  tooltips,
}: {
  spec: GaugeSpec
  value: number
  tooltips: boolean
}) => {
  const { track, arc, zones, marks, majorTicks, minorTicks } = spec
  const { tickLabels, needles, dot, tooltip } = spec
  const { value: valueText, unit, title } = spec
  const labelFormat = { compass: compassLabel, clock: clockLabel }

  return (
    <>
      {spec.face.show && (
        <GaugeHub radius={spec.face.radius} color={spec.face.color} />
      )}
      {track.show && (
        <GaugeTrack
          width={track.width}
          color={track.color}
          opacity={track.opacity}
          cap={track.cap}
          offset={track.offset}
        />
      )}
      {zones.show && (
        <GaugeZones
          zones={zones.list}
          width={zones.width}
          offset={zones.offset}
          gap={zones.gap}
          cap={zones.cap}
          endCap={zones.endCap}
          opacity={zones.opacity}
        />
      )}
      {arc.show && (
        <GaugeArc
          width={arc.width}
          color={
            arc.colorByZone
              ? zoneColor(zones.list, value, arc.color)
              : arc.color
          }
          opacity={arc.opacity}
          cap={arc.cap}
          offset={arc.offset}
          reverse={arc.reverse}
        />
      )}
      {marks.show && (
        <GaugeMarks
          values={zoneCutoffs(zones.list)}
          length={marks.length}
          width={marks.width}
          color={marks.color}
          offset={marks.offset}
          cap={marks.cap}
        />
      )}
      {minorTicks.show && (
        <GaugeTicks
          count={minorTicks.count}
          length={minorTicks.length}
          width={minorTicks.width}
          color={minorTicks.color}
          offset={minorTicks.offset}
          cap={minorTicks.cap}
          opacity={minorTicks.opacity}
        />
      )}
      {majorTicks.show && (
        <GaugeTicks
          count={majorTicks.count}
          length={majorTicks.length}
          width={majorTicks.width}
          color={majorTicks.color}
          offset={majorTicks.offset}
          cap={majorTicks.cap}
          opacity={majorTicks.opacity}
        />
      )}
      {tickLabels.show && (
        <GaugeTickLabels
          count={tickLabels.count}
          offset={tickLabels.offset}
          fontSize={tickLabels.fontSize}
          color={tickLabels.color}
          font={tickLabels.font}
          weight={tickLabels.weight}
          decimals={tickLabels.decimals}
          format={
            tickLabels.format === "number"
              ? undefined
              : labelFormat[tickLabels.format]
          }
        />
      )}
      {needles.show &&
        needles.list.map((needle, i) => (
          <GaugeNeedle
            key={i}
            style={needle.style}
            length={needle.length}
            width={needle.width}
            color={needle.color}
            tail={needle.tail}
            tailColor={needle.tailColor}
            tailDot={needle.tailDot}
            gap={needle.gap}
            turns={needle.turns}
          />
        ))}
      {needles.show && (
        <GaugeHub radius={needles.hub.radius} color={needles.hub.color} />
      )}
      {dot.show && (
        <GaugeDot
          radius={dot.radius}
          color={dot.color}
          opacity={dot.opacity}
          offset={dot.offset}
          turns={dot.turns}
        />
      )}
      {tooltips && tooltip.show && (
        <GaugeTooltip
          label={tooltip.label || undefined}
          unit={tooltip.unit || undefined}
          decimals={tooltip.decimals}
          position={tooltip.position}
          side={tooltip.side}
          offset={tooltip.offset}
          gap={tooltip.gap}
          open={tooltip.open || undefined}
        />
      )}
      {valueText.show && (
        <GaugeValue
          x={valueText.x}
          y={valueText.y}
          fontSize={valueText.fontSize}
          color={valueText.color}
          font={valueText.font}
          weight={valueText.weight}
          anchor={valueText.anchor}
          decimals={valueText.decimals}
        />
      )}
      {unit.show && (
        <GaugeText
          x={unit.x}
          y={unit.y}
          fontSize={unit.fontSize}
          color={unit.color}
          font={unit.font}
          weight={unit.weight}
          anchor={unit.anchor}
        >
          {unit.text}
        </GaugeText>
      )}
      {title.show && (
        <GaugeText
          x={title.x}
          y={title.y}
          fontSize={title.fontSize}
          color={title.color}
          font={title.font}
          weight={title.weight}
          anchor={title.anchor}
        >
          {title.text}
        </GaugeText>
      )}
    </>
  )
}
