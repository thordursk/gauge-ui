import { useEffect, useMemo, useRef, useState } from "react"
import { useControlPanel } from "@/hooks/use-control-panel"

import {
  arcsConfig,
  cutoffsConfig,
  domainOf,
  dotConfig,
  flatValues,
  gaugeConfig,
  needleConfig,
  textPanelConfig,
  ticksConfig,
  valueConfig,
  type PanelValues,
  type PlayMode,
} from "@/lib/gauge-panels"
import {
  addedLayer,
  specFromLayers,
  withLive,
  type GaugeLayer,
} from "@/lib/gauge-layers"
import {
  gaugeTemplates,
  templateLayers,
  type GaugeTemplate,
} from "@/lib/gauge-templates"
import { readStored, storageKeys, writeStored } from "@/lib/storage"

/**
 * Setting a layer's values takes more than one pass. A control can be absent
 * from the panel until another value brings it into being — a colour's custom
 * field, which only exists once "custom" is picked — and a slider whose range
 * follows the domain only accepts the new range after the panel has rebuilt.
 * Each pass runs after a render, so by the last one every control is there.
 */
const APPLY_PASSES = 3

/**
 * Registers the control panels that make up the studio and keeps the gauges
 * they describe. The panels hold one gauge at a time, the selected layer; the
 * others keep their values until they come round again. The rendered panel
 * tree itself comes from `ControlsRoot`, which reads the same registry.
 */
export const useGaugeControllers = () => {
  /* The template the current work started from. Reset returns to it rather
     than to the bare defaults. */
  const [activeTemplate, setActiveTemplate] = useState<GaugeTemplate | null>(
    null
  )
  const [layers, setLayers] = useState<GaugeLayer[]>(() => templateLayers(null))
  const [selected, setSelected] = useState(0)
  /* Changes every time a whole composition is loaded, which is a template or
     a reset and nothing else. The preview hangs its key on it, so each of
     those remounts the gauges and plays them in from the foot of their
     domains; picking a layer or editing one leaves it alone. */
  const [sweepKey, setSweepKey] = useState(0)
  const kind = selected === 0 ? "host" : "inset"

  const gaugeCtl = useControlPanel(
    "Gauge",
    gaugeConfig(flatValues("gauge"), kind),
    { id: "gauge" }
  )
  const gauge = gaugeCtl.values
  const { min, max } = domainOf(gauge)

  const valCtl = useControlPanel("Value", valueConfig(min, max), {
    id: "value",
  })
  const val = valCtl.values

  const arcsCtl = useControlPanel(
    "Track & arc",
    arcsConfig(flatValues("arcs")),
    { id: "arcs" }
  )
  const arcs = arcsCtl.values

  const cutoffsCtl = useControlPanel(
    "Cutoffs",
    cutoffsConfig(min, max, flatValues("cutoffs")),
    { id: "cutoffs", defaultCollapsed: true }
  )
  const cutoffs = cutoffsCtl.values

  const ticksCtl = useControlPanel(
    "Ticks",
    ticksConfig(flatValues("ticks")),
    { id: "ticks", defaultCollapsed: true }
  )
  const ticks = ticksCtl.values

  const textCtl = useControlPanel(
    "Text",
    textPanelConfig(flatValues("text")),
    { id: "text" }
  )
  const text = textCtl.values

  const needleCtl = useControlPanel(
    "Needle",
    needleConfig(flatValues("needle")),
    { id: "needle", defaultCollapsed: true }
  )
  const needle = needleCtl.values

  const dotCtl = useControlPanel("Dot", dotConfig(flatValues("dot")), {
    id: "dot",
    defaultCollapsed: true,
  })
  const dot = dotCtl.values

  const controllers = {
    gauge: gaugeCtl,
    value: valCtl,
    arcs: arcsCtl,
    cutoffs: cutoffsCtl,
    ticks: ticksCtl,
    text: textCtl,
    needle: needleCtl,
    dot: dotCtl,
  }

  /* The controllers are read through a ref so applying a layer does not have
     to list them as dependencies and restart itself on every render. */
  const panels = useRef(controllers)
  useEffect(() => {
    panels.current = controllers
  })

  /** The panels as they stand, for the layer they are currently editing. */
  const readLive = (): PanelValues => ({
    gauge: panels.current.gauge.getValues(),
    value: panels.current.value.getValues(),
    arcs: panels.current.arcs.getValues(),
    cutoffs: panels.current.cutoffs.getValues(),
    ticks: panels.current.ticks.getValues(),
    text: panels.current.text.getValues(),
    needle: panels.current.needle.getValues(),
    dot: panels.current.dot.getValues(),
  })

  /* Wrapped so that loading the same layer twice over is still a new request. */
  const [request, setRequest] = useState<{ values: PanelValues } | null>(null)
  /* True while the panels are still catching up with a layer they have just
     been handed. Until they have, they still hold the gauge that was on
     screen before, so for those few frames the layer speaks for itself. */
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    if (!request) return
    const { gauge, value, arcs, cutoffs, ticks, text, needle, dot } =
      request.values
    let pass = 0
    let frame = 0

    const apply = () => {
      panels.current.gauge.setValues(gauge)
      panels.current.value.setValues(value)
      panels.current.arcs.setValues(arcs)
      panels.current.cutoffs.setValues(cutoffs)
      panels.current.ticks.setValues(ticks)
      panels.current.text.setValues(text)
      panels.current.needle.setValues(needle)
      panels.current.dot.setValues(dot)
      /* The next pass waits for the panels to have been rebuilt around what
         this one set. One more frame after the last of them, and what they
         report is the layer that was asked for. */
      if (++pass < APPLY_PASSES) frame = requestAnimationFrame(apply)
      else frame = requestAnimationFrame(() => setSettling(false))
    }

    apply()
    return () => cancelAnimationFrame(frame)
  }, [request])

  /** Loads a layer into the panels. */
  const load = (layer: GaugeLayer) => {
    setSettling(true)
    setRequest({ values: layer.values })
  }

  /** Every layer, the selected one with the live panel values over it. */
  const current = useMemo(
    () =>
      layers.map((layer, i) =>
        i === selected && !settling
          ? withLive(layer, {
              gauge,
              value: val,
              arcs,
              cutoffs,
              ticks,
              text,
              needle,
              dot,
            })
          : layer
      ),
    [
      layers,
      selected,
      settling,
      gauge,
      val,
      arcs,
      cutoffs,
      ticks,
      text,
      needle,
      dot,
    ]
  )

  const spec = useMemo(() => specFromLayers(current), [current])

  /* The stage is the ground the whole composition stands on, and the gauge's
     own value is its own, so both stay the host's however deep into an inset
     the panels are. */
  const stage = current[0].values.gauge.stage
  const hostValue = current[0].values.value.value

  /** Keeps what the panels hold before they are handed to another layer. */
  const store = (list: GaugeLayer[]) =>
    list.map((layer, i) =>
      i === selected ? withLive(layer, readLive()) : layer
    )

  const selectLayer = (index: number) => {
    if (index === selected || index >= layers.length) return
    setLayers(store)
    setSelected(index)
    load(layers[index])
  }

  const addLayer = () => {
    const layer = addedLayer(layers)
    setLayers((list) => [...store(list), layer])
    setSelected(layers.length)
    load(layer)
  }

  /** Removes an inset, the selected one by default; the host gauge stays. */
  const removeLayer = (index = selected) => {
    if (index === 0 || index >= layers.length) return
    const rest = store(layers).filter((_, i) => i !== index)
    setLayers(rest)
    if (index === selected) {
      setSelected(0)
      load(rest[0])
    } else if (index < selected) {
      /* The panels still hold the selected layer, which has only shifted
         down the list, so there is nothing to load. */
      setSelected(selected - 1)
    }
  }

  const applyLayers = (next: GaugeLayer[]) => {
    setLayers(next)
    setSelected(0)
    setSweepKey((n) => n + 1)
    load(next[0])
  }

  const selectTemplate = (template: GaugeTemplate) => {
    writeStored(storageKeys.template, template.id)
    setActiveTemplate(template)
    applyLayers(templateLayers(template))
  }

  /* The template the last visit ended on. It is picked for the visitor once
     the panels are up rather than at the first render, which keeps the server
     markup and the hydration pass agreeing; a frame later it loads and sweeps
     in exactly as it would have had they picked it themselves. */
  const pick = useRef(selectTemplate)
  useEffect(() => {
    pick.current = selectTemplate
  })

  useEffect(() => {
    const stored = readStored(storageKeys.template)
    const template = gaugeTemplates.find((t) => t.id === stored)
    if (template) pick.current(template)
  }, [])

  const reset = () => applyLayers(templateLayers(activeTemplate))

  /* Dragging the value bar takes over from any running play mode. */
  const setValue = (v: number) => {
    valCtl.setValue("value", v)
    if (val.mode !== "manual") valCtl.setValue("mode", "manual")
  }

  /* The play mode drives the whole composition, so every layer is given it
     and not just the one in the panels. Without that, picking another layer
     would hand the panels that layer's own mode and quietly stop the run. */
  const setMode = (mode: PlayMode) => {
    valCtl.setValue("mode", mode)
    setLayers((list) =>
      list.map((layer) => ({
        ...layer,
        values: { ...layer.values, value: { ...layer.values.value, mode } },
      }))
    )
  }

  return {
    spec,
    stage,
    hostValue,
    sweepKey,
    /* The live composition, so a layer's thumbnail moves with its panels. */
    layers: current,
    selected,
    selectLayer,
    addLayer,
    removeLayer,
    value: val,
    domain: { min, max },
    setValue,
    setMode,
    activeTemplate,
    selectTemplate,
    reset,
  }
}
