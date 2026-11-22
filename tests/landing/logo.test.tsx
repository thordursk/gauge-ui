import { describe, expect, it } from "vitest"

import { arcPath, Logo, LogoLink, polar } from "@/components/logo"
import { markup } from "@/tests/markup"

describe("Logo", () => {
  it("renders the mark", () => {
    expect(markup(<Logo className="size-7" />)).toMatchSnapshot()
  })

  it("renders the link with its animated mark", () => {
    expect(markup(<LogoLink />)).toMatchSnapshot()
  })

  it("leaves hover styling to LogoLink", () => {
    expect(markup(<Logo />)).not.toContain("group-hover")
    expect(markup(<LogoLink />)).toContain("group-hover/logo")
  })
})

describe("polar", () => {
  it("measures degrees clockwise from three o'clock in screen space", () => {
    const center = { x: 12, y: 13 }
    expect(polar(center, 8, 0)).toEqual({ x: 20, y: 13 })
    expect(polar(center, 8, 90)).toEqual({ x: 12, y: 21 })
    expect(polar(center, 8, 270)).toEqual({ x: 12, y: 5 })
  })

  it("rounds to two decimals", () => {
    expect(polar({ x: 12, y: 13 }, 5.5, 300)).toEqual({ x: 14.75, y: 8.24 })
  })
})

describe("arcPath", () => {
  it("draws the logo's three-quarter sweep", () => {
    expect(arcPath({ x: 12, y: 13 }, 8, 135, 45)).toBe(
      "M6.34 18.66 A8 8 0 1 1 17.66 18.66"
    )
  })

  it("uses the small arc for a sweep under half a turn", () => {
    expect(arcPath({ x: 0, y: 0 }, 10, 0, 90)).toBe("M10 0 A10 10 0 0 1 0 10")
  })
})
