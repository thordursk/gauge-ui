import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  Element.prototype.getAnimations ??= () => []
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("min-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const renderStudio = async () => {
  const { GaugeStudio } = await import("@/components/gauge-studio")
  return render(<GaugeStudio />)
}

const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 50)))

describe("GaugeStudio", () => {
  it("renders the gauge and every visible panel", async () => {
    await renderStudio()
    for (const name of ["Gauge", "Value", "Track & arc", "Text"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0)
    }
    expect(screen.queryByRole("button", { name: "Needle" })).toBeTruthy()
  })

  it("shows a colour's custom picker only while custom is picked", async () => {
    const { ControlsStore } = await import("@/lib/controls")
    await renderStudio()
    expect(screen.queryByText("Custom")).toBeNull()
    act(() => ControlsStore.updateValue("gauge", "stage.token", "custom"))
    expect(screen.getAllByText("Custom").length).toBeGreaterThan(0)
    act(() => ControlsStore.updateValue("gauge", "stage.token", "muted"))
    expect(screen.queryByText("Custom")).toBeNull()
  })

  it("hides the needle panel for a stored bar template", async () => {
    const { gaugeTemplates } = await import("@/lib/gauge-templates")
    const bar = gaugeTemplates.find((t) => t.category === "bars")!
    localStorage.setItem("gauge-ui:template", bar.id)
    await renderStudio()
    await settle()
    expect(screen.queryByRole("button", { name: "Needle" })).toBeNull()
    expect(screen.getByRole("button", { name: bar.name })).toBeTruthy()
  })

  it("resets the composition from the header", async () => {
    await renderStudio()
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByRole("button", { name: "Gauge" })).toBeTruthy()
  })
})
