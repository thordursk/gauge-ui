import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  Gauge,
  GaugeArc,
  GaugeDot,
  GaugeHub,
  GaugeInset,
  GaugeMarks,
  GaugeNeedle,
  GaugeStack,
  GaugeText,
  GaugeTickFill,
  GaugeTickLabels,
  GaugeTicks,
  GaugeTooltip,
  GaugeTrack,
  GaugeValue,
  GaugeZones,
  LinearGauge,
  LinearGaugeInset,
} from "@/components/gauge"

const zones = [
  { to: 30, color: "green" },
  { to: 70, color: "orange" },
  { to: 100, color: "red" },
]

const fixtures = {
  dial: (
    <Gauge value={63} min={0} max={100} padding={40}>
      <GaugeTrack />
      <GaugeZones zones={zones} gap={2} offset={30} endCap="round" />
      <GaugeArc />
      <GaugeArc from={50} reverse color="blue" />
      <GaugeStack
        parts={[
          { weight: 2, color: "a" },
          { weight: 1, color: "b" },
        ]}
        offset={-30}
      />
      <GaugeTicks count={10} offset={20} />
      <GaugeTickFill count={20} offset={-20} color="lit" dimColor="dim" />
      <GaugeMarks values={[30, 70]} />
      <GaugeTickLabels count={5} />
      <GaugeNeedle style="line" />
      <GaugeNeedle style="pointer" width={14} tail={20} />
      <GaugeNeedle style="compass" width={16} tailColor="red" />
      <GaugeNeedle style="arrow" width={6} tailDot={8} gap={30} />
      <GaugeHub />
      <GaugeDot radius={10} halo={4} />
      <GaugeValue fontSize={40} />
      <GaugeText y={40}>label</GaugeText>
      <GaugeTooltip />
    </Gauge>
  ),
  fitted: (
    <Gauge
      value={2.5}
      min={0}
      max={5}
      startAngle={90}
      endAngle={270}
      fit="content"
    >
      <GaugeTrack />
      <GaugeArc />
    </Gauge>
  ),
  nightRing: (
    <Gauge
      value={[22, 6]}
      min={0}
      max={24}
      startAngle={180}
      endAngle={540}
      wrap
    >
      <GaugeTrack />
      <GaugeArc />
      <GaugeArc from={20} to={27} wrap color="w" offset={20} />
      <GaugeTickFill count={24} color="lit" dimColor="dim" />
      <GaugeTickFill
        count={24}
        mode="nearest"
        offset={20}
        color="lit"
        dimColor="dim"
      />
      <GaugeMarks count={8} />
      <GaugeValue />
    </Gauge>
  ),
  compass: (
    <Gauge
      value={350}
      min={0}
      max={360}
      startAngle={180}
      endAngle={540}
      rotate={30}
      wrap
    >
      <GaugeTicks count={16} />
      <GaugeNeedle style="compass" />
    </Gauge>
  ),
  bar: (
    <LinearGauge
      value={42}
      min={0}
      max={100}
      length={300}
      padding={{ top: 20, bottom: 30 }}
    >
      <GaugeTrack width={8} />
      <GaugeZones zones={zones} gap={4} />
      <GaugeArc width={8} />
      <GaugeArc from={80} to={130} wrap offset={12} />
      <GaugeTickFill count={10} offset={-12} color="lit" dimColor="dim" />
      <GaugeTickLabels count={4} offset={-24} />
      <GaugeDot />
      <GaugeValue y={-30} />
      <GaugeTooltip />
    </LinearGauge>
  ),
  verticalBar: (
    <LinearGauge
      value={[-3, 6]}
      min={-12}
      max={12}
      orientation="vertical"
      length={200}
    >
      <GaugeTrack />
      <GaugeArc />
      <GaugeTickFill count={12} mode="nearest" color="lit" dimColor="dim" />
    </LinearGauge>
  ),
  insets: (
    <Gauge value={70} padding={30}>
      <GaugeTrack />
      <GaugeInset value={0.4} min={0} max={1} x={0} y={60} scale={0.3}>
        <GaugeArc />
        <GaugeNeedle />
      </GaugeInset>
      <LinearGaugeInset value={5} max={10} y={-80} scale={0.5}>
        <GaugeArc />
      </LinearGaugeInset>
    </Gauge>
  ),
}

describe("rendered markup", () => {
  for (const [name, element] of Object.entries(fixtures)) {
    it(`renders ${name} unchanged`, () => {
      expect(renderToStaticMarkup(element)).toMatchSnapshot()
    })
  }
})
