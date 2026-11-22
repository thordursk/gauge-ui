import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AnimatedGauge } from "@/components/animated-gauge"
import { addedLayer, hostLayer, specFromLayers } from "@/lib/gauge-layers"
import { defaultPanelValues, mergeValues } from "@/lib/gauge-panels"

const host = hostLayer(defaultPanelValues())
const inset = addedLayer([host])
const spec = specFromLayers([
  host,
  {
    ...inset,
    values: mergeValues(inset.values, {
      gauge: { max: 50 },
      value: { value: 20 },
    }),
  },
])

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
  act(() => {
    vi.advanceTimersByTime(20)
  })
}

const readings = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("text"))
    .map((node) => node.textContent ?? "")
    .filter((text) => /^-?\d+$/.test(text))
    .map(Number)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  })
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: query.includes("reduce"), media: query }) as MediaQueryList
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("AnimatedGauge", () => {
  it("shows the values it is given in manual mode", () => {
    const { container } = render(
      <AnimatedGauge
        spec={spec}
        value={40}
        mode="manual"
        period={3}
        amplitude={0.2}
      />
    )
    expect(readings(container)).toEqual([40, 20])
  })

  it("sweeps the host and every inset in sweep mode", () => {
    const { container } = render(
      <AnimatedGauge
        spec={spec}
        value={40}
        mode="sweep"
        period={3}
        amplitude={0.2}
      />
    )
    advance(0)
    expect(readings(container)).toEqual([100, 50])
    advance(3000)
    expect(readings(container)).toEqual([0, 0])
  })

  it("keeps up with a composition edited while it plays", () => {
    const props = {
      value: 40,
      mode: "sweep",
      period: 3,
      amplitude: 0.2,
    } as const
    const { container, rerender } = render(
      <AnimatedGauge spec={spec} {...props} />
    )
    advance(0)
    expect(readings(container)).toEqual([100, 50])
    const wider = {
      ...spec,
      insets: spec.insets?.map((inset) => ({
        ...inset,
        spec: { ...inset.spec, domain: { ...inset.spec.domain, max: 80 } },
      })),
    }
    rerender(<AnimatedGauge spec={wider} {...props} />)
    advance(3000)
    expect(readings(container)).toEqual([0, 80])
    advance(3000)
    expect(readings(container)).toEqual([100, 0])
  })

  it("starts from the foot of the domain when it plays in", () => {
    const { container } = render(
      <AnimatedGauge
        spec={spec}
        value={40}
        mode="manual"
        period={3}
        amplitude={0.2}
        sweepIn
      />
    )
    expect(readings(container)).toEqual([0, 0])
    advance(0)
    expect(readings(container)).toEqual([40, 20])
  })
})
