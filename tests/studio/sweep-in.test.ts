import { describe, expect, it } from "vitest"

import {
  HALF_TURN,
  SWEEP_TURNS,
  maxTurns,
  reachWithinOneSweep,
  sweepFrom,
} from "@/components/gauge-preview"
import type { GaugeSpec, NeedleSpec } from "@/lib/gauge-spec"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

const base = templatePreview(gaugeTemplates[0]).spec

const withTurns = (needles: number[], dot?: number): GaugeSpec => {
  const needle = base.needles.list[0] ?? ({} as NeedleSpec)
  return {
    ...base,
    domain: { ...base.domain, min: 0, max: 100 },
    needles: {
      ...base.needles,
      show: needles.length > 0,
      list: needles.map((turns) => ({ ...needle, turns })),
    },
    dot: { ...base.dot, show: dot !== undefined, turns: dot ?? 1 },
  }
}

describe("reachWithinOneSweep", () => {
  it("keeps a wrapping part under half a turn", () => {
    expect(SWEEP_TURNS).toBeLessThan(HALF_TURN)
    for (const turns of [2, 12, 60, 720]) {
      const reach = reachWithinOneSweep(100, turns)
      expect((reach / 100) * turns).toBeLessThan(HALF_TURN)
    }
  })

  it("sweeps the whole span when nothing wraps", () => {
    expect(reachWithinOneSweep(100, 1)).toBe(100)
  })
})

describe("maxTurns", () => {
  it("is one with no needle or dot", () => {
    expect(maxTurns(withTurns([]))).toBe(1)
  })

  it("takes the fastest needle or dot", () => {
    expect(maxTurns(withTurns([1, 12, 720]))).toBe(720)
    expect(maxTurns(withTurns([1], 3))).toBe(3)
  })

  it("ignores hidden parts", () => {
    const spec = withTurns([12], 30)
    expect(
      maxTurns({
        ...spec,
        needles: { ...spec.needles, show: false },
        dot: { ...spec.dot, show: false },
      })
    ).toBe(1)
  })
})

describe("sweepFrom", () => {
  it("starts a gauge that doesn't wrap at the foot of its domain", () => {
    expect(sweepFrom(withTurns([1]), 70)).toBe(0)
  })

  it("starts a wrapping gauge within one sweep of its value", () => {
    expect(sweepFrom(withTurns([1, 12]), 70)).toBeCloseTo(
      70 - (100 / 12) * SWEEP_TURNS
    )
  })
})
