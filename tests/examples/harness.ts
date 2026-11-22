import { act, renderHook } from "@testing-library/react"
import { vi } from "vitest"

export const onScreen = ({ reducedMotion = false } = {}) => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        private readonly callback: (
          entries: Pick<IntersectionObserverEntry, "isIntersecting">[]
        ) => void
      ) {}
      observe() {
        this.callback([{ isIntersecting: true }])
      }
      disconnect() {}
    }
  )
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reducedMotion && query.includes("reduce"),
  }))
}

export const seededRandom = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

export const rounded = (value: unknown): unknown => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toPrecision(6)) : value
  }
  if (Array.isArray(value)) return value.map(rounded)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, rounded(v)])
    )
  }
  return value
}

export const runHook = <T>(
  useSimulation: (target: { current: Element | null }) => T
) => {
  const target = { current: document.createElement("div") }
  return renderHook(() => useSimulation(target))
}

export const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

export const sample = <T>(
  read: () => T,
  { every, times }: { every: number; times: number }
) =>
  Array.from({ length: times }, () => {
    advance(every)
    return rounded(read())
  })
