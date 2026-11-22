import { afterEach, describe, expect, it, vi } from "vitest"

const unmounts: (() => void)[] = []

const offStep = ["rev-tape", "shift-lights", "throttle"]

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount())
  localStorage.clear()
})

const freshStudio = async () => {
  vi.resetModules()
  const { act, renderHook } = await import("@testing-library/react")
  const { useGaugeControllers } = await import("@/hooks/use-gauge-controllers")
  const templates = await import("@/lib/gauge-templates")
  const hook = renderHook(() => useGaugeControllers())
  unmounts.push(hook.unmount)
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })
  await settle()
  return { ...hook, act, settle, ...templates }
}

describe("useGaugeControllers", () => {
  it("starts from the default composition", async () => {
    const { result, templatePreview, gaugeTemplates } = await freshStudio()
    expect(result.current.layers).toHaveLength(1)
    expect(result.current.selected).toBe(0)
    expect(result.current.spec.domain.min).toBe(0)
    expect(result.current.spec.domain.max).toBe(100)
    expect(templatePreview(gaugeTemplates[0]).spec).not.toEqual(
      result.current.spec
    )
  })

  it("loads every template back to its own spec", async () => {
    const { result, act, settle, gaugeTemplates, templatePreview } =
      await freshStudio()
    for (const template of gaugeTemplates) {
      act(() => result.current.selectTemplate(template))
      await settle()
      const { spec, value } = templatePreview(template)
      if (offStep.includes(template.id)) {
        expect(result.current.spec, template.id).toMatchSnapshot(template.id)
      } else {
        expect(result.current.spec, template.id).toEqual(spec)
      }
      expect(result.current.hostValue, template.id).toBe(value)
      expect(result.current.layers.length, template.id).toBe(
        1 + (template.insets?.length ?? 0)
      )
    }
  })

  it("keeps a layer's edits while another is selected", async () => {
    const { result, act, settle } = await freshStudio()
    act(() => result.current.addLayer())
    await settle()
    expect(result.current.selected).toBe(1)
    act(() => result.current.setValue(12))
    await settle()
    expect(result.current.spec.insets?.[0].value).toBe(12)

    act(() => result.current.selectLayer(0))
    await settle()
    expect(result.current.selected).toBe(0)
    expect(result.current.spec.insets?.[0].value).toBe(12)
    expect(result.current.hostValue).toBe(62)

    act(() => result.current.selectLayer(1))
    await settle()
    expect(result.current.value.value).toBe(12)
  })

  it("reapplies a template loaded twice", async () => {
    const { result, act, settle, gaugeTemplates, templatePreview } =
      await freshStudio()
    const template = gaugeTemplates[0]
    act(() => result.current.selectTemplate(template))
    await settle()
    act(() => result.current.setValue(1))
    await settle()
    expect(result.current.hostValue).toBe(1)
    act(() => result.current.selectTemplate(template))
    await settle()
    expect(result.current.hostValue).toBe(templatePreview(template).value)
  })

  it("resets to the active template", async () => {
    const { result, act, settle, gaugeTemplates, templatePreview } =
      await freshStudio()
    const template = gaugeTemplates[3]
    act(() => result.current.selectTemplate(template))
    await settle()
    act(() => result.current.setValue(2))
    await settle()
    act(() => result.current.reset())
    await settle()
    expect(result.current.spec).toEqual(templatePreview(template).spec)
  })

  it("removes an inset and returns to the host", async () => {
    const { result, act, settle } = await freshStudio()
    act(() => result.current.addLayer())
    await settle()
    act(() => result.current.removeLayer())
    await settle()
    expect(result.current.layers).toHaveLength(1)
    expect(result.current.selected).toBe(0)
    expect(result.current.spec.insets).toBeUndefined()
  })

  it("holds one play mode for the whole composition", async () => {
    const { result, act, settle } = await freshStudio()
    act(() => result.current.addLayer())
    await settle()
    act(() => result.current.setMode("sweep"))
    await settle()
    act(() => result.current.selectLayer(0))
    await settle()
    expect(result.current.value.mode).toBe("sweep")
    act(() => result.current.setValue(30))
    await settle()
    expect(result.current.value.mode).toBe("manual")
  })

  it("restores the stored template on mount", async () => {
    vi.resetModules()
    const { gaugeTemplates, templatePreview } =
      await import("@/lib/gauge-templates")
    const template = gaugeTemplates[5]
    localStorage.setItem("gauge-ui:template", template.id)
    const { result } = await freshStudio()
    expect(result.current.activeTemplate?.id).toBe(template.id)
    expect(result.current.spec).toEqual(templatePreview(template).spec)
  })
})
