import { afterEach, describe, expect, it, vi } from "vitest"

const unmounts: (() => void)[] = []

const offStep = ["rev-tape", "shift-lights", "throttle"]

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount())
  localStorage.clear()
  vi.restoreAllMocks()
})

const freshStudio = async () => {
  vi.resetModules()
  const { act, renderHook } = await import("@testing-library/react")
  const { useGaugeControllers } = await import("@/hooks/use-gauge-controllers")
  const { ControlsStore } = await import("@/lib/controls")
  const templates = await import("@/lib/gauge-templates")
  const hook = renderHook(() => useGaugeControllers())
  unmounts.push(hook.unmount)
  const frames = vi.spyOn(window, "requestAnimationFrame")
  return { ...hook, act, frames, ControlsStore, ...templates }
}

describe("useGaugeControllers", () => {
  it("starts from the default composition", async () => {
    const { result, templatePreview, gaugeTemplates } = await freshStudio()
    expect(result.current.composition.insets).toHaveLength(0)
    expect(result.current.hostSelected).toBe(true)
    expect(result.current.spec.domain.min).toBe(0)
    expect(result.current.spec.domain.max).toBe(100)
    expect(templatePreview(gaugeTemplates[0]).spec).not.toEqual(
      result.current.spec
    )
  })

  it("loads every template back to its own spec in one pass", async () => {
    const { result, act, frames, gaugeTemplates, templatePreview } =
      await freshStudio()
    for (const template of gaugeTemplates) {
      act(() => result.current.selectTemplate(template))
      const { spec, value } = templatePreview(template)
      if (offStep.includes(template.id)) {
        expect(result.current.spec, template.id).toMatchSnapshot(template.id)
      } else {
        expect(result.current.spec, template.id).toEqual(spec)
      }
      expect(result.current.hostValue, template.id).toBe(value)
      expect(result.current.composition.insets.length, template.id).toBe(
        template.insets?.length ?? 0
      )
    }
    expect(frames).not.toHaveBeenCalled()
  })

  it("hands the panels a layer's dependent controls in the same pass", async () => {
    const { result, act, ControlsStore, gaugeTemplates } = await freshStudio()
    const custom = gaugeTemplates.find((template) =>
      JSON.stringify(template).includes('"custom"')
    )
    const ranged = gaugeTemplates.find(
      (template) => template.values.value?.range
    )
    const bar = gaugeTemplates.find(
      (template) => template.values.gauge?.shape === "linear"
    )
    expect(ranged && bar).toBeTruthy()

    act(() => result.current.selectTemplate(ranged!))
    const paths = (id: string) =>
      ControlsStore.getPanels()
        .find((panel) => panel.id === id)
        ?.controls.map((control) => control.path)
    expect(paths("value")).toContain("from")
    expect(result.current.spec.rangeFrom).toBe(ranged!.values.value?.from)

    act(() => result.current.selectTemplate(bar!))
    expect(paths("gauge")).toContain("orientation")
    expect(paths("gauge")).not.toContain("startAngle")
    expect(
      ControlsStore.getPanels().find((panel) => panel.id === "needle")?.hidden
    ).toBe(true)

    if (custom) {
      act(() => result.current.selectTemplate(custom))
      expect(JSON.stringify(result.current.composition)).toContain('"custom"')
    }
  })

  it("rebuilds a panel when an edit brings controls into being", async () => {
    const { result, act, ControlsStore } = await freshStudio()
    const paths = (id: string) =>
      ControlsStore.getPanels()
        .find((panel) => panel.id === id)
        ?.controls.map((control) => control.path)
    expect(paths("value")).not.toContain("from")
    act(() => ControlsStore.updateValue("value", "range", true))
    expect(paths("value")).toContain("from")
    expect(result.current.spec.rangeFrom).toBe(30)

    act(() => ControlsStore.updateValue("gauge", "shape", "linear"))
    expect(paths("gauge")).toContain("length")
    expect(result.current.spec.domain.shape).toBe("linear")

    act(() => ControlsStore.updateValue("gauge", "max", 500))
    expect(result.current.spec.domain.max).toBe(500)
    const value = ControlsStore.getPanels()
      .find((panel) => panel.id === "value")
      ?.controls.find((control) => control.path === "value")
    expect(value?.max).toBe(500)
  })

  it("keeps a layer's edits while another is selected", async () => {
    const { result, act } = await freshStudio()
    act(() => result.current.addLayer())
    const inset = result.current.selected
    expect(result.current.hostSelected).toBe(false)
    act(() => result.current.setValue(12))
    expect(result.current.spec.insets?.[0].value).toBe(12)

    act(() => result.current.selectLayer("main"))
    expect(result.current.hostSelected).toBe(true)
    expect(result.current.spec.insets?.[0].value).toBe(12)
    expect(result.current.hostValue).toBe(62)

    act(() => result.current.selectLayer(inset))
    expect(result.current.value.value).toBe(12)
  })

  it("reapplies a template loaded twice", async () => {
    const { result, act, gaugeTemplates, templatePreview } = await freshStudio()
    const template = gaugeTemplates[0]
    act(() => result.current.selectTemplate(template))
    act(() => result.current.setValue(1))
    expect(result.current.hostValue).toBe(1)
    act(() => result.current.selectTemplate(template))
    expect(result.current.hostValue).toBe(templatePreview(template).value)
  })

  it("plays a loaded composition in again", async () => {
    const { result, act, gaugeTemplates } = await freshStudio()
    const before = result.current.playIn
    act(() => result.current.selectTemplate(gaugeTemplates[0]))
    expect(result.current.playIn).toBe(before + 1)
    act(() => result.current.addLayer())
    expect(result.current.playIn).toBe(before + 1)
    act(() => result.current.reset())
    expect(result.current.playIn).toBe(before + 2)
  })

  it("resets to the active template", async () => {
    const { result, act, gaugeTemplates, templatePreview } = await freshStudio()
    const template = gaugeTemplates[3]
    act(() => result.current.selectTemplate(template))
    act(() => result.current.setValue(2))
    act(() => result.current.reset())
    expect(result.current.spec).toEqual(templatePreview(template).spec)
  })

  it("removes an inset and returns to the host", async () => {
    const { result, act } = await freshStudio()
    act(() => result.current.addLayer())
    act(() => result.current.removeLayer())
    expect(result.current.composition.insets).toHaveLength(0)
    expect(result.current.hostSelected).toBe(true)
    expect(result.current.spec.insets).toBeUndefined()
  })

  it("never removes the host", async () => {
    const { result, act } = await freshStudio()
    act(() => result.current.removeLayer("main"))
    expect(result.current.composition.host.id).toBe("main")
  })

  it("holds one play mode for the whole composition", async () => {
    const { result, act } = await freshStudio()
    act(() => result.current.addLayer())
    act(() => result.current.setMode("sweep"))
    act(() => result.current.selectLayer("main"))
    expect(result.current.mode).toBe("sweep")
    act(() => result.current.addLayer())
    expect(result.current.mode).toBe("sweep")
    act(() => result.current.setValue(30))
    expect(result.current.mode).toBe("manual")
  })

  it("restores the stored template on mount", async () => {
    vi.resetModules()
    const { gaugeTemplates, templatePreview } =
      await import("@/lib/gauge-templates")
    const template = gaugeTemplates[5]
    localStorage.setItem("gauge-ui:template", template.id)
    const { result, act } = await freshStudio()
    expect(result.current.activeTemplate).toBeNull()
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(result.current.activeTemplate?.id).toBe(template.id)
    expect(result.current.spec).toEqual(templatePreview(template).spec)
  })
})
