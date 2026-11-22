import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAnimatedValue, type GaugeTransition } from "@/components/gauge"

const tween: GaugeTransition = { type: "tween", duration: 1, ease: "linear" }

type Props = { target: number }

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe("useAnimatedValue", () => {
  it("returns the target as is without a transition", () => {
    const { result, rerender } = renderHook(
      ({ target }: Props) => useAnimatedValue(target, undefined, { span: 100 }),
      { initialProps: { target: 10 } }
    )
    expect(result.current).toBe(10)
    rerender({ target: 70 })
    expect(result.current).toBe(70)
  })

  it("starts from initial and tweens to the target", () => {
    const { result } = renderHook(() =>
      useAnimatedValue(80, tween, { span: 100, initial: 0 })
    )
    expect(result.current).toBe(0)
    advance(500)
    expect(result.current).toBeGreaterThan(30)
    expect(result.current).toBeLessThan(50)
    advance(1000)
    expect(result.current).toBe(80)
  })

  it("goes the long way round on an open domain", () => {
    const { result, rerender } = renderHook(
      ({ target }: Props) => useAnimatedValue(target, tween, { span: 360 }),
      { initialProps: { target: 350 } }
    )
    rerender({ target: 10 })
    advance(500)
    expect(result.current).toBeGreaterThan(150)
    expect(result.current).toBeLessThan(210)
  })

  it("takes the short way round a wrapped domain", () => {
    const { result, rerender } = renderHook(
      ({ target }: Props) =>
        useAnimatedValue(target, tween, { span: 360, wrap: true }),
      { initialProps: { target: 350 } }
    )
    rerender({ target: 10 })
    advance(500)
    expect(result.current).toBeGreaterThan(355)
    expect(result.current).toBeLessThan(365)
    advance(1000)
    expect(result.current).toBe(10)
  })

  it("starts a wrapped value from initial by the short way", () => {
    const { result } = renderHook(() =>
      useAnimatedValue(20, tween, { span: 360, initial: 340, wrap: true })
    )
    expect(result.current).toBe(340)
    advance(500)
    expect(result.current).toBeGreaterThan(355)
    expect(result.current).toBeLessThan(365)
  })
})
