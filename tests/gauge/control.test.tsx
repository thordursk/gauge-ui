import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  Gauge,
  GaugeArc,
  GaugeControl,
  GaugeDot,
  GaugeTrack,
  LinearGauge,
  polar,
  type GaugeOrientation,
  type GaugeRange,
} from "@/components/gauge"

import { square, fakeLayout, type Layout } from "./dom"

type Geometry = {
  min?: number
  max?: number
  startAngle?: number
  endAngle?: number
  wrap?: boolean
  orientation?: GaugeOrientation
  length?: number
}

type Extra = {
  step?: number
  knob?: boolean
  disabled?: boolean
  onPress?: () => void
  label?: string
  thumbLabels?: readonly [string, string]
}

const Controlled = <V extends number | GaugeRange>({
  initial,
  geometry,
  onChange,
  extra,
}: {
  initial: V
  geometry: Geometry
  onChange: (value: number | GaugeRange) => void
  extra?: Extra
}) => {
  const [value, setValue] = useState<number | GaugeRange>(initial)
  const { orientation, length, startAngle, endAngle, ...domain } = geometry
  const linear = orientation !== undefined
  const face: ReactNode = linear ? (
    <LinearGauge
      value={value}
      orientation={orientation}
      length={length}
      padding={0}
      {...domain}
    >
      <GaugeTrack />
      <GaugeArc />
      <GaugeDot />
    </LinearGauge>
  ) : (
    <Gauge
      value={value}
      startAngle={startAngle}
      endAngle={endAngle}
      padding={0}
      {...domain}
    >
      <GaugeTrack />
      <GaugeArc />
      <GaugeDot />
    </Gauge>
  )
  return (
    <GaugeControl
      value={value as number}
      onChange={(next: number | GaugeRange) => {
        onChange(next)
        setValue(next)
      }}
      label={extra?.label ?? "Level"}
      {...geometry}
      {...extra}
    >
      {face}
    </GaugeControl>
  )
}

const setup = <V extends number | GaugeRange>(
  initial: V,
  geometry: Geometry = {},
  extra?: Extra
) => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <Controlled
      initial={initial}
      geometry={geometry}
      onChange={onChange}
      extra={extra}
    />
  )
  const surface = view.container.querySelector<HTMLElement>(
    "[data-slot=gauge-control]"
  )!
  const last = () => onChange.mock.lastCall?.[0]
  return { onChange, user, surface, last, ...view }
}

let layout: Layout = square(200)
fakeLayout(() => layout)

const at = (angle: number, reach = 0.9) => {
  const p = polar(100 * reach, angle)
  return { clientX: 100 + p.x, clientY: 100 + p.y }
}

const press = async (
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  coords: { clientX: number; clientY: number }
) => user.pointer({ keys: "[MouseLeft>]", target, coords })

const move = async (
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  coords: { clientX: number; clientY: number }
) => user.pointer({ target, coords })

const release = async (
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement
) => user.pointer({ keys: "[/MouseLeft]", target })

describe("GaugeControl on a round gauge", () => {
  it("sets the value under a press on the ring", async () => {
    layout = square(200)
    const { user, surface, last } = setup(10)
    await press(user, surface, at(180))
    expect(last()).toBe(50)
  })

  it("follows a drag round the ring and holds past an end", async () => {
    layout = square(200)
    const { user, surface, last } = setup(10)
    await press(user, surface, at(180))
    await move(user, surface, at(250))
    expect(last()).toBe(75)
    await move(user, surface, at(335))
    expect(last()).toBe(100)
    await release(user, surface)
    await move(user, surface, at(180))
    expect(last()).toBe(100)
  })

  it("reads angles from a gauge with its own sweep", async () => {
    layout = square(200)
    const { user, surface, last } = setup(0, {
      min: 0,
      max: 24,
      startAngle: 180,
      endAngle: 540,
    })
    await press(user, surface, at(270))
    expect(last()).toBe(6)
    await move(user, surface, at(0))
    expect(last()).toBe(12)
  })

  it("leaves a press on the face to onPress", async () => {
    layout = square(200)
    const onPress = vi.fn()
    const { user, surface, onChange } = setup(30, {}, { onPress })
    await press(user, surface, at(180, 0.3))
    await release(user, surface)
    expect(onChange).not.toHaveBeenCalled()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("turns a knob by as far as the pointer goes round", async () => {
    layout = square(200)
    const { user, surface, last } = setup(50, {}, { knob: true })
    await press(user, surface, at(180, 0.3))
    await move(user, surface, at(208, 0.3))
    expect(last()).toBe(60)
  })

  it("turns a knob across six o'clock by the short way", async () => {
    layout = square(200)
    const { user, surface, last } = setup(
      50,
      { startAngle: 180, endAngle: 540 },
      { knob: true }
    )
    await press(user, surface, at(350, 0.3))
    await move(user, surface, at(10, 0.3))
    expect(last()).toBe(56)
    await move(user, surface, at(340, 0.3))
    expect(last()).toBe(47)
  })

  it("steps with the keyboard and clamps at the ends", async () => {
    layout = square(200)
    const { user, last } = setup(95)
    await user.tab()
    const slider = screen.getByRole("slider")
    expect(slider).toHaveProperty("tabIndex", 0)
    await user.keyboard("{ArrowUp}")
    expect(last()).toBe(96)
    await user.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(last()).toBe(94)
    await user.keyboard("{PageUp}")
    expect(last()).toBe(100)
    await user.keyboard("{Home}")
    expect(last()).toBe(0)
    await user.keyboard("{PageDown}")
    expect(last()).toBe(0)
    await user.keyboard("{End}")
    expect(last()).toBe(100)
  })

  it("names the value for screen readers", () => {
    layout = square(200)
    setup(42, { min: 10, max: 90 })
    const slider = screen.getByRole("slider")
    expect(slider.getAttribute("aria-valuemin")).toBe("10")
    expect(slider.getAttribute("aria-valuemax")).toBe("90")
    expect(slider.getAttribute("aria-valuenow")).toBe("42")
    expect(slider.getAttribute("aria-label")).toBe("Level")
    expect(slider.hasAttribute("aria-orientation")).toBe(false)
  })

  it("carries keys round a wrapped domain", async () => {
    layout = square(200)
    const { user, last } = setup(
      355,
      { min: 0, max: 360, startAngle: 180, endAngle: 540, wrap: true },
      { step: 10 }
    )
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(last()).toBe(5)
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(last()).toBe(345)
  })

  it("turns a wrapped knob on round past the seam", async () => {
    layout = square(200)
    const { user, surface, last } = setup(
      350,
      { min: 0, max: 360, startAngle: 180, endAngle: 540, wrap: true },
      { knob: true }
    )
    await press(user, surface, at(90, 0.3))
    await move(user, surface, at(110, 0.3))
    expect(last()).toBe(10)
  })

  it("does nothing while disabled", async () => {
    layout = square(200)
    const { user, surface, onChange } = setup(30, {}, { disabled: true })
    await press(user, surface, at(180))
    expect(screen.getByRole("slider")).toHaveProperty("tabIndex", -1)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("GaugeControl with a range", () => {
  it("moves whichever thumb is nearer the press", async () => {
    layout = square(200)
    const { user, surface, last } = setup([20, 80] as const)
    await press(user, surface, at(40 + 0.3 * 280))
    expect(last()).toEqual([30, 80])
    await release(user, surface)
    await press(user, surface, at(40 + 0.7 * 280))
    expect(last()).toEqual([30, 70])
  })

  it("holds the thumbs short of passing on an open domain", async () => {
    layout = square(200)
    const { user, surface, last } = setup([20, 60] as const)
    await press(user, surface, at(40 + 0.3 * 280))
    await move(user, surface, at(40 + 0.9 * 280))
    expect(last()).toEqual([60, 60])
  })

  it("keys each thumb on its own", async () => {
    layout = square(200)
    const { user, last } = setup([20, 80] as const)
    const [first, second] = screen.getAllByRole("slider")
    expect(first.getAttribute("aria-label")).toBe("Level start")
    expect(second.getAttribute("aria-label")).toBe("Level end")
    expect(first.getAttribute("aria-valuemax")).toBe("80")
    expect(second.getAttribute("aria-valuemin")).toBe("20")
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(last()).toEqual([21, 80])
    await user.tab()
    await user.keyboard("{ArrowDown}")
    expect(last()).toEqual([21, 79])
  })

  it("lets thumbs cross the seam of a wrapped ring", async () => {
    layout = square(200)
    const { user, surface, last } = setup(
      [22, 6] as const,
      { min: 0, max: 24, startAngle: 180, endAngle: 540, wrap: true },
      { thumbLabels: ["Bedtime", "Wake"] }
    )
    await press(user, surface, at(180 + 23 * 15))
    expect(last()).toEqual([23, 6])
    await release(user, surface)
    await press(user, surface, at(180 + 8 * 15))
    expect(last()).toEqual([23, 8])
    await release(user, surface)
    const wake = screen.getByRole("slider", { name: "Wake" })
    expect(wake.getAttribute("aria-valuemin")).toBe("0")
    wake.focus()
    await user.keyboard("{ArrowDown>9/}")
    expect(last()).toEqual([23, 23])
  })

  it("turns a whole range with a knob, keeping its width", async () => {
    layout = square(200)
    const { user, surface, last } = setup([20, 40] as const, {}, { knob: true })
    await press(user, surface, at(180, 0.3))
    await move(user, surface, at(208, 0.3))
    expect(last()).toEqual([30, 50])
    await move(user, surface, at(320, 0.3))
    expect(last()).toEqual([70, 90])
    await move(user, surface, at(350, 0.3))
    expect(last()).toEqual([80, 100])
  })
})

const bar = (orientation: GaugeOrientation): Layout =>
  orientation === "horizontal"
    ? {
        box: { left: 0, top: 0, width: 400, height: 40 },
        ctm: { a: 1, b: 0, c: 0, d: 1, e: 200, f: 20 },
      }
    : {
        box: { left: 0, top: 0, width: 40, height: 400 },
        ctm: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 200 },
      }

describe("GaugeControl on a linear gauge", () => {
  it("sets the value under a press along a horizontal bar", async () => {
    layout = bar("horizontal")
    const { user, surface, last } = setup(0, { orientation: "horizontal" })
    await press(user, surface, { clientX: 300, clientY: 20 })
    expect(last()).toBe(75)
    await move(user, surface, { clientX: 520, clientY: 20 })
    expect(last()).toBe(100)
    await move(user, surface, { clientX: -40, clientY: 20 })
    expect(last()).toBe(0)
  })

  it("reads a vertical bar from the bottom up", async () => {
    layout = bar("vertical")
    const { user, surface, last } = setup(0, {
      orientation: "vertical",
      min: -10,
      max: 10,
    })
    await press(user, surface, { clientX: 20, clientY: 100 })
    expect(last()).toBe(5)
    expect(screen.getByRole("slider").getAttribute("aria-orientation")).toBe(
      "vertical"
    )
  })

  it("maps a bar of its own length", async () => {
    layout = {
      box: { left: 0, top: 0, width: 200, height: 40 },
      ctm: { a: 1, b: 0, c: 0, d: 1, e: 100, f: 20 },
    }
    const { user, surface, last } = setup(0, {
      orientation: "horizontal",
      length: 200,
    })
    await press(user, surface, { clientX: 150, clientY: 20 })
    expect(last()).toBe(75)
  })

  it("moves by as far as a knob drag goes along the bar", async () => {
    layout = bar("horizontal")
    const { user, surface, last } = setup(
      50,
      { orientation: "horizontal" },
      { knob: true }
    )
    await press(user, surface, { clientX: 300, clientY: 20 })
    expect(last()).toBeUndefined()
    await move(user, surface, { clientX: 340, clientY: 20 })
    expect(last()).toBe(60)
  })

  it("moves the nearer thumb of a range along the bar", async () => {
    layout = bar("horizontal")
    const { user, surface, last } = setup([20, 80] as const, {
      orientation: "horizontal",
    })
    await press(user, surface, { clientX: 340, clientY: 20 })
    expect(last()).toEqual([20, 85])
  })
})

const markup = (node: ReactNode) => renderToStaticMarkup(node)
const noop = () => {}

describe("GaugeControl markup", () => {
  it("renders a round control unchanged", () => {
    expect(
      markup(
        <GaugeControl
          value={30}
          onChange={noop}
          label="Volume"
          min={0}
          max={100}
        >
          <Gauge value={30}>
            <GaugeArc />
          </Gauge>
        </GaugeControl>
      )
    ).toMatchSnapshot()
  })

  it("renders a range control unchanged", () => {
    expect(
      markup(
        <GaugeControl
          value={[22, 6] as const}
          onChange={noop}
          label="Sleep"
          min={0}
          max={24}
          startAngle={180}
          endAngle={540}
          wrap
          valueText={["10 pm", "6 am"]}
        >
          <Gauge
            value={[22, 6]}
            min={0}
            max={24}
            startAngle={180}
            endAngle={540}
            wrap
          >
            <GaugeArc />
          </Gauge>
        </GaugeControl>
      )
    ).toMatchSnapshot()
  })

  it("renders a linear control unchanged", () => {
    expect(
      markup(
        <GaugeControl
          value={-6}
          onChange={noop}
          label="Gain"
          min={-12}
          max={12}
          orientation="vertical"
          length={200}
          disabled
          className="h-40"
        >
          <LinearGauge
            value={-6}
            min={-12}
            max={12}
            orientation="vertical"
            length={200}
          >
            <GaugeArc />
          </LinearGauge>
        </GaugeControl>
      )
    ).toMatchSnapshot()
  })
})
