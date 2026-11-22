import { describe, expect, it, vi } from "vitest"

import {
  ControlsStore,
  DEFAULT_PAD_AXIS,
  flattenUpdates,
  parseConfig,
  resolveValues,
  type ControlConfig,
} from "@/lib/controls"

const config = {
  size: [10, 0, 100, 5],
  ratio: 0.5,
  show: true,
  label: "Speed",
  tint: "#ff0000",
  side: {
    type: "select",
    options: ["left", { value: "right", label: "Right" }],
    default: "right",
  },
  note: { type: "text", placeholder: "Say something" },
  spot: { type: "pad", x: [0.5, -1, 1, 0.1] },
  motion: { type: "spring", bounce: 0.2 },
  group: {
    depth: [3, 1, 9],
    nested: { on: false },
    _collapsed: true,
  },
} satisfies ControlConfig

describe("parseConfig", () => {
  const parsed = parseConfig(config)

  it("reads each control's type and range", () => {
    const summary = (path: string) => {
      const control = parsed.byPath.get(path)
      return (
        control && {
          type: control.type,
          min: control.min,
          max: control.max,
          step: control.step,
        }
      )
    }
    expect(summary("size")).toEqual({
      type: "slider",
      min: 0,
      max: 100,
      step: 5,
    })
    expect(summary("ratio")).toEqual({
      type: "slider",
      min: 0,
      max: 1,
      step: 0.01,
    })
    expect(summary("group.depth")).toEqual({
      type: "slider",
      min: 1,
      max: 9,
      step: 0.1,
    })
    expect(parsed.byPath.get("show")?.type).toBe("toggle")
    expect(parsed.byPath.get("label")?.type).toBe("text")
    expect(parsed.byPath.get("tint")?.type).toBe("color")
    expect(parsed.byPath.get("side")?.type).toBe("select")
    expect(parsed.byPath.get("note")?.placeholder).toBe("Say something")
    expect(parsed.byPath.get("spot")?.type).toBe("pad")
    expect(parsed.byPath.get("motion")?.type).toBe("transition")
  })

  it("nests folders and honours _collapsed", () => {
    const group = parsed.byPath.get("group")
    expect(group?.type).toBe("folder")
    expect(group?.defaultOpen).toBe(false)
    expect(group?.children?.map((c) => c.path)).toEqual([
      "group.depth",
      "group.nested",
    ])
    expect(parsed.byPath.get("group.nested")?.defaultOpen).toBe(true)
    expect(parsed.byPath.has("group._collapsed")).toBe(false)
  })

  it("collects flat defaults", () => {
    expect(parsed.defaults).toEqual({
      size: 10,
      ratio: 0.5,
      show: true,
      label: "Speed",
      tint: "#ff0000",
      side: "right",
      note: "",
      spot: { x: 0.5, y: 0 },
      motion: { type: "spring", bounce: 0.2 },
      "group.depth": 3,
      "group.nested.on": false,
    })
  })
})

describe("resolveValues", () => {
  it("nests flat values and falls back to defaults", () => {
    const resolved = resolveValues(config, {
      size: 40,
      "group.nested.on": true,
    })
    expect(resolved.size).toBe(40)
    expect(resolved.ratio).toBe(0.5)
    expect(resolved.side).toBe("right")
    expect(resolved.spot).toEqual({ x: 0.5, y: 0 })
    expect(resolved.group.depth).toBe(3)
    expect(resolved.group.nested.on).toBe(true)
    expect("_collapsed" in resolved.group).toBe(false)
  })

  it("round-trips the parsed defaults", () => {
    const resolved = resolveValues(config, parseConfig(config).defaults)
    expect(resolved).toEqual({
      size: 10,
      ratio: 0.5,
      show: true,
      label: "Speed",
      tint: "#ff0000",
      side: "right",
      note: "",
      spot: { x: 0.5, y: 0 },
      motion: { type: "spring", bounce: 0.2 },
      group: { depth: 3, nested: { on: false } },
    })
  })
})

describe("flattenUpdates", () => {
  it("flattens nested updates into dotted paths", () => {
    expect(
      flattenUpdates(config, {
        size: 20,
        spot: { x: 0.1, y: 0.2 },
        motion: { type: "easing", duration: 1, ease: [0, 0, 1, 1] },
        group: { depth: 4, nested: { on: true } },
      })
    ).toEqual({
      size: 20,
      spot: { x: 0.1, y: 0.2 },
      motion: { type: "easing", duration: 1, ease: [0, 0, 1, 1] },
      "group.depth": 4,
      "group.nested.on": true,
    })
  })

  it("drops keys the config does not know and undefined values", () => {
    expect(
      flattenUpdates(config, {
        size: undefined,
        missing: 1,
        group: { other: 2 },
      })
    ).toEqual({})
  })
})

describe("ControlsStore", () => {
  const panel = {
    level: [50, 0, 100, 10],
    side: { type: "select", options: ["left", "right"], default: "left" },
  } satisfies ControlConfig

  it("keeps edits across a rebuild, clamping and snapping sliders", () => {
    ControlsStore.setPanel("rebuild", "Rebuild", panel)
    ControlsStore.updateValues("rebuild", { level: 73, side: "right" })
    expect(ControlsStore.getValues("rebuild")).toMatchObject({
      level: 70,
      side: "right",
    })
    ControlsStore.setPanel("rebuild", "Rebuild", {
      ...panel,
      level: [50, 0, 60, 10],
    })
    expect(ControlsStore.getValues("rebuild")).toMatchObject({
      level: 60,
      side: "right",
    })
    ControlsStore.unregisterPanel("rebuild")
  })

  it("keeps values whose control has gone", () => {
    ControlsStore.setPanel("gone", "Gone", panel)
    ControlsStore.updateValues("gone", { side: "right" })
    ControlsStore.setPanel("gone", "Gone", { level: panel.level })
    expect(ControlsStore.getValues("gone").side).toBe("right")
    ControlsStore.unregisterPanel("gone")
  })

  it("retains values while a panel is unmounted", () => {
    ControlsStore.setPanel("retained", "Retained", panel)
    ControlsStore.updateValues("retained", { level: 20 })
    ControlsStore.unregisterPanel("retained")
    expect(ControlsStore.getPanels().some((p) => p.id === "retained")).toBe(
      false
    )
    ControlsStore.setPanel("retained", "Retained", panel)
    expect(ControlsStore.getValues("retained").level).toBe(20)
    ControlsStore.unregisterPanel("retained")
  })

  it("falls back when a select's option is gone", () => {
    ControlsStore.setPanel("fallback", "Fallback", panel)
    ControlsStore.updateValues("fallback", { side: "right" })
    ControlsStore.setPanel("fallback", "Fallback", {
      ...panel,
      side: { type: "select", options: ["left", "up"], default: "up" },
    })
    expect(ControlsStore.getValues("fallback").side).toBe("up")
    ControlsStore.unregisterPanel("fallback")
  })
})

describe("pad axes", () => {
  it("default to the unit square", () => {
    const parsed = parseConfig({ spot: { type: "pad" } })
    expect(DEFAULT_PAD_AXIS).toEqual([0, -1, 1, 0.01])
    expect(parsed.defaults.spot).toEqual({ x: 0, y: 0 })
  })
})

describe("colour controls", () => {
  const swatches = {
    fill: {
      token: {
        type: "select",
        options: ["primary", "custom"],
        default: "primary",
      },
      custom: "#38bdf8",
      _variant: "color",
    },
  } satisfies ControlConfig

  it("are marked in their meta and hold both fields", () => {
    const parsed = parseConfig(swatches)
    const fill = parsed.byPath.get("fill")
    expect(fill?.variant).toBe("color")
    expect(fill?.children?.map((child) => child.type)).toEqual([
      "select",
      "color",
    ])
  })

  it("resolve the custom colour only while custom is picked", () => {
    expect(resolveValues(swatches, {}).fill).toEqual({ token: "primary" })
    expect(resolveValues(swatches, { "fill.token": "custom" }).fill).toEqual({
      token: "custom",
      custom: "#38bdf8",
    })
    expect(
      resolveValues(swatches, {
        "fill.token": "custom",
        "fill.custom": "#123456",
      }).fill
    ).toEqual({ token: "custom", custom: "#123456" })
  })

  it("take a custom colour in the same update as its token", () => {
    expect(
      flattenUpdates(swatches, { fill: { token: "custom", custom: "#123456" } })
    ).toEqual({ "fill.token": "custom", "fill.custom": "#123456" })
  })
})

describe("ControlsStore.loadPanel", () => {
  const ranged = (max: number) =>
    ({ level: [0, 0, max, 1] }) satisfies ControlConfig

  it("normalises loaded values against the config it is handed", () => {
    ControlsStore.setPanel("load", "Load", ranged(100))
    ControlsStore.loadPanel("load", ranged(8000), { level: 6500 })
    expect(ControlsStore.getValues("load").level).toBe(6500)
    expect(
      ControlsStore.getPanels().find((panel) => panel.id === "load")
        ?.controls[0].max
    ).toBe(8000)
    ControlsStore.unregisterPanel("load")
  })

  it("keeps the panel's name and options unless told otherwise", () => {
    ControlsStore.setPanel("opts", "Opts", ranged(10), {
      defaultCollapsed: true,
    })
    ControlsStore.loadPanel("opts", ranged(10), { level: 3 }, { hidden: true })
    const panel = ControlsStore.getPanels().find((p) => p.id === "opts")
    expect(panel).toMatchObject({
      name: "Opts",
      defaultCollapsed: true,
      hidden: true,
    })
    ControlsStore.unregisterPanel("opts")
  })

  it("waits for an unregistered panel in its retained values", () => {
    ControlsStore.loadPanel("later", ranged(10), { level: 4 })
    ControlsStore.setPanel("later", "Later", ranged(10))
    expect(ControlsStore.getValues("later").level).toBe(4)
    ControlsStore.unregisterPanel("later")
  })
})

describe("ControlsStore.setPanel", () => {
  it("ignores the same config object", () => {
    const config = { level: [0, 0, 10, 1] } satisfies ControlConfig
    ControlsStore.setPanel("same", "Same", config)
    const listener = vi.fn()
    const unsubscribe = ControlsStore.subscribeGlobal(listener)
    ControlsStore.setPanel("same", "Same", config)
    expect(listener).not.toHaveBeenCalled()
    ControlsStore.setPanel("same", "Same", { ...config })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    ControlsStore.unregisterPanel("same")
  })

  it("keeps the values snapshot while nothing changed", () => {
    const config = { level: [0, 0, 10, 1] } satisfies ControlConfig
    ControlsStore.setPanel("stable", "Stable", config)
    const before = ControlsStore.getValues("stable")
    ControlsStore.setPanel("stable", "Stable", { ...config })
    expect(ControlsStore.getValues("stable")).toBe(before)
    ControlsStore.unregisterPanel("stable")
  })
})
