import { readFileSync } from "node:fs"
import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { themeMinWidth, useMediaQuery } from "@/hooks/use-media-query"

afterEach(() => {
  document.documentElement.style.removeProperty("--breakpoint-md")
  vi.unstubAllGlobals()
})

describe("themeMinWidth", () => {
  it("reads a breakpoint from the theme", () => {
    document.documentElement.style.setProperty("--breakpoint-md", "48rem")
    expect(themeMinWidth("--breakpoint-md")).toBe("(min-width: 48rem)")
  })

  it("has the md breakpoint emitted whether or not a class uses it", () => {
    const css = readFileSync("app/globals.css", "utf8")
    expect(css).toMatch(/@theme static \{[^}]*--breakpoint-md:/)
  })
})

describe("useMediaQuery", () => {
  it("resolves a query given as a function on the client", () => {
    document.documentElement.style.setProperty("--breakpoint-md", "48rem")
    const matchMedia = vi.fn((query: string) => ({
      matches: query === "(min-width: 48rem)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    vi.stubGlobal("matchMedia", matchMedia)
    const { result } = renderHook(() =>
      useMediaQuery(() => themeMinWidth("--breakpoint-md"))
    )
    expect(result.current).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 48rem)")
  })
})
