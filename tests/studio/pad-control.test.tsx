import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  PadControl,
  padToScreenY,
  screenToPadY,
} from "@/components/controls/pad-control"

describe("pad Y flip", () => {
  it("puts the top of the screen at the top of the pad", () => {
    expect(screenToPadY(0)).toBe(1)
    expect(screenToPadY(1)).toBe(0)
    expect(padToScreenY(1)).toBe(0)
  })

  it.each([0, 0.25, 0.5, 0.8, 1])("round-trips %s", (t) => {
    expect(padToScreenY(screenToPadY(t))).toBeCloseTo(t)
    expect(screenToPadY(padToScreenY(t))).toBeCloseTo(t)
  })
})

describe("PadControl", () => {
  it("draws a high value near the top", () => {
    const { container } = render(
      <PadControl
        label="Position"
        value={{ x: 0, y: 0.5 }}
        onChange={() => {}}
      />
    )
    const dot = container.querySelector<HTMLElement>(".rounded-full")
    expect(dot?.style.top).toBe("25%")
  })

  it("reads a press near the top as a high value", () => {
    const onChange = vi.fn()
    render(
      <PadControl label="Position" value={{ x: 0, y: 0 }} onChange={onChange} />
    )
    const pad = screen.getByLabelText("Position", { selector: "div" })
    pad.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect
    pad.setPointerCapture = () => {}
    fireEvent.pointerDown(pad, { clientX: 100, clientY: 25, pointerId: 1 })
    expect(onChange).toHaveBeenCalledWith({ x: 0, y: 0.5 })
  })
})
