import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  Gauge,
  GaugeArc,
  GaugeControl,
  GaugeInset,
  GaugeTooltip,
  arcBox,
  polar,
  type GaugeTooltipPosition,
} from "@/components/gauge"

import { square, fakeLayout } from "./dom"

fakeLayout(() => square(200))

const SIZE = { width: 80, height: 30 }

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => SIZE.width,
  })
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => SIZE.height,
  })
})

afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)
    .offsetWidth
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)
    .offsetHeight
})

const placed = () => {
  const bubble = screen.getByRole("tooltip").parentElement!
  return {
    x: parseFloat(bubble.style.left),
    y: parseFloat(bubble.style.top),
  }
}

const expected = (
  p: { x: number; y: number },
  d: { x: number; y: number },
  gap: number
) => {
  const m = Math.max(Math.abs(d.x), Math.abs(d.y)) || 1
  const u = { x: d.x / m, y: d.y / m }
  const len = Math.hypot(u.x, u.y) || 1
  return {
    x: 100 + p.x + (u.x / len) * gap + ((u.x - 1) / 2) * SIZE.width,
    y: 100 + p.y + (u.y / len) * gap + ((u.y - 1) / 2) * SIZE.height,
  }
}

const show = (position: GaugeTooltipPosition, value = 25) =>
  render(
    <Gauge value={value}>
      <GaugeTooltip open position={position} avoidCollisions={false} gap={8} />
    </Gauge>
  )

describe("GaugeTooltip placement", () => {
  it("stands off a diagonal value outward from the scale", () => {
    show("value", 25)
    const angle = 40 + 0.25 * 280
    const want = expected(polar(224, angle), polar(1, angle), 8)
    const got = placed()
    expect(got.x).toBeCloseTo(want.x, 3)
    expect(got.y).toBeCloseTo(want.y, 3)
  })

  it("stands off straight down at six o'clock", () => {
    show("value", 50)
    const got = placed()
    const want = expected(polar(224, 180), { x: 0, y: -1 }, 8)
    expect(got.x).toBeCloseTo(want.x, 3)
    expect(got.y).toBeCloseTo(want.y, 3)
  })

  it("stands off a corner away from the dial", () => {
    show("top-right")
    const b = arcBox(224, 40, 320)
    const want = expected({ x: b.x + b.width, y: b.y }, { x: 1, y: -1 }, 8)
    const got = placed()
    expect(got.x).toBeCloseTo(want.x, 3)
    expect(got.y).toBeCloseTo(want.y, 3)
  })

  it("centres on the centre", () => {
    show("center")
    expect(placed()).toEqual({
      x: 100 - SIZE.width / 2,
      y: 100 - SIZE.height / 2,
    })
  })
})

const noop = () => {}

describe("GaugeTooltip owner", () => {
  it("opens while its control has keyboard focus", async () => {
    const user = userEvent.setup()
    render(
      <>
        <GaugeControl value={30} onChange={noop} label="Level">
          <Gauge value={30}>
            <GaugeArc />
            <GaugeTooltip />
          </Gauge>
        </GaugeControl>
        <button>after</button>
      </>
    )
    expect(screen.queryByRole("tooltip")).toBeNull()
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("tooltip")).toBeTruthy()
    await user.tab()
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  it("opens while a thumb of its range control has focus", async () => {
    const user = userEvent.setup()
    render(
      <>
        <GaugeControl value={[20, 60] as const} onChange={noop} label="Band">
          <Gauge value={[20, 60]}>
            <GaugeArc />
            <GaugeTooltip />
          </Gauge>
        </GaugeControl>
        <button>after</button>
      </>
    )
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("tooltip")).toBeTruthy()
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("tooltip")).toBeTruthy()
    await user.tab()
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  it("finds its control from inside an inset", async () => {
    const user = userEvent.setup()
    render(
      <GaugeControl value={[20, 60] as const} onChange={noop} label="Band">
        <Gauge value={[20, 60]}>
          <GaugeInset value={4} max={10} scale={0.3}>
            <GaugeTooltip />
          </GaugeInset>
        </Gauge>
      </GaugeControl>
    )
    await user.tab()
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("tooltip").textContent).toBe("4")
  })

  it("opens while a focusable element round the gauge has focus", async () => {
    const user = userEvent.setup()
    render(
      <button>
        <Gauge value={30}>
          <GaugeTooltip />
        </Gauge>
      </button>
    )
    await user.tab()
    await user.keyboard("{Shift}")
    expect(screen.getByRole("tooltip")).toBeTruthy()
  })

  it("stays shut for a gauge with nothing focusable round it", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Gauge value={30}>
          <GaugeTooltip />
        </Gauge>
        <button>after</button>
      </>
    )
    await user.tab()
    await user.keyboard("{Shift}")
    expect(screen.queryByRole("tooltip")).toBeNull()
  })
})
