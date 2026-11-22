import { describe, expect, it } from "vitest"

import { resolveValues } from "@/lib/controls"
import {
  arcsConfig,
  buildSpec,
  cutoffsConfig,
  defaultPanelValues,
  defaultsOf,
  dotConfig,
  gaugeConfig,
  needleConfig,
  textPanelConfig,
  ticksConfig,
  tooltipConfig,
  valueConfig,
} from "@/lib/gauge-panels"

const panelConfigs = {
  "gauge, round host": gaugeConfig("host", false),
  "gauge, round inset": gaugeConfig("inset", false),
  "gauge, linear host": gaugeConfig("host", true),
  "gauge, linear inset": gaugeConfig("inset", true),
  "value, defaults": valueConfig(0, 100, true),
  "value, single": valueConfig(0, 100, false),
  "value, range": valueConfig(-50, 50, true),
  "arcs, round": arcsConfig(false),
  "arcs, linear": arcsConfig(true),
  "cutoffs, 0 to 100": cutoffsConfig(0, 100),
  "cutoffs, 4 to 12": cutoffsConfig(4, 12),
  ticks: ticksConfig(),
  text: textPanelConfig(),
  needle: needleConfig(),
  dot: dotConfig(),
  tooltip: tooltipConfig(),
}

describe("defaultsOf", () => {
  it.each(Object.entries(panelConfigs))("%s", (_, config) => {
    expect(defaultsOf(config)).toMatchSnapshot()
  })
})

describe("defaultPanelValues", () => {
  it("fills every panel", () => {
    expect(defaultPanelValues()).toMatchSnapshot()
  })

  it("follows the domain", () => {
    expect(defaultPanelValues(4, 12).value).toMatchSnapshot()
  })

  it("builds the default spec", () => {
    expect(buildSpec(defaultPanelValues())).toMatchSnapshot()
  })
})

const resolveArcs = (flat: Record<string, string>) =>
  resolveValues(arcsConfig(false), flat)

describe("colour controls", () => {
  it("carry no custom colour while a palette token is picked", () => {
    const arcs = resolveArcs({ "track.color.token": "primary" })
    expect(arcs.track.color).toEqual({ token: "primary" })
  })

  it("carry the custom colour once custom is picked", () => {
    const arcs = resolveArcs({
      "track.color.token": "custom",
      "track.color.custom": "#123456",
    })
    expect(arcs.track.color).toEqual({ token: "custom", custom: "#123456" })
  })

  it("fall back to the default custom colour", () => {
    const arcs = resolveArcs({ "track.color.token": "custom" })
    expect(arcs.track.color).toEqual({ token: "custom", custom: "#38bdf8" })
  })
})
