import { useEffect, useEffectEvent, useMemo, useState } from "react"
import { useControlPanel, useControlValue } from "@/hooks/use-control-panel"

import {
  arcsConfig,
  cutoffsConfig,
  domainOf,
  dotConfig,
  gaugeConfig,
  needleConfig,
  panelInputs,
  textPanelConfig,
  ticksConfig,
  tooltipConfig,
  valueConfig,
  type LayerKind,
  type PanelValues,
  type PlayMode,
} from "@/lib/gauge-panels"
import {
  addedLayer,
  findLayer,
  kindOf,
  mapLayers,
  specOf,
  withLive,
  type Composition,
  type GaugeLayer,
} from "@/lib/gauge-layers"
import {
  gaugeTemplates,
  templateComposition,
  type GaugeTemplate,
} from "@/lib/gauge-templates"
import { readStored, storageKeys, writeStored } from "@/lib/storage"

const TICKS = ticksConfig()
const TEXT = textPanelConfig()
const NEEDLE = needleConfig()
const DOT = dotConfig()
const TOOLTIP = tooltipConfig()

export const useGaugeControllers = () => {
  const [activeTemplate, setActiveTemplate] = useState<GaugeTemplate | null>(
    null
  )
  const [composition, setComposition] = useState<Composition>(() =>
    templateComposition(null)
  )
  const [selected, setSelected] = useState(composition.host.id)
  const [mode, setMode] = useState<PlayMode>("manual")
  const [playIn, setPlayIn] = useState(0)
  const kind = kindOf(composition, selected)

  const linear = useControlValue("gauge", "shape") === "linear"
  const range = useControlValue("value", "range") === true

  const gaugeCfg = useMemo(() => gaugeConfig(kind, linear), [kind, linear])
  const gaugeCtl = useControlPanel("Gauge", gaugeCfg, { id: "gauge" })
  const gauge = gaugeCtl.values
  const { min, max } = domainOf(gauge)

  const valueCfg = useMemo(
    () => valueConfig(min, max, range),
    [min, max, range]
  )
  const valCtl = useControlPanel("Value", valueCfg, { id: "value" })
  const val = valCtl.values

  const arcsCfg = useMemo(() => arcsConfig(linear), [linear])
  const arcsCtl = useControlPanel("Track & arc", arcsCfg, { id: "arcs" })
  const arcs = arcsCtl.values

  const cutoffsCfg = useMemo(() => cutoffsConfig(min, max), [min, max])
  const cutoffsCtl = useControlPanel("Cutoffs", cutoffsCfg, {
    id: "cutoffs",
    defaultCollapsed: true,
  })
  const cutoffs = cutoffsCtl.values

  const ticksCtl = useControlPanel("Ticks", TICKS, {
    id: "ticks",
    defaultCollapsed: true,
  })
  const ticks = ticksCtl.values

  const textCtl = useControlPanel("Text", TEXT, { id: "text" })
  const text = textCtl.values

  const needleCtl = useControlPanel("Needle", NEEDLE, {
    id: "needle",
    defaultCollapsed: true,
    hidden: linear,
  })
  const needle = needleCtl.values

  const dotCtl = useControlPanel("Dot", DOT, {
    id: "dot",
    defaultCollapsed: true,
  })
  const dot = dotCtl.values

  const tooltipCtl = useControlPanel("Tooltip", TOOLTIP, {
    id: "tooltip",
    defaultCollapsed: true,
  })
  const tooltip = tooltipCtl.values

  const readLive = (): PanelValues => ({
    gauge: gaugeCtl.getValues(),
    value: valCtl.getValues(),
    arcs: arcsCtl.getValues(),
    cutoffs: cutoffsCtl.getValues(),
    ticks: ticksCtl.getValues(),
    text: textCtl.getValues(),
    needle: needleCtl.getValues(),
    dot: dotCtl.getValues(),
    tooltip: tooltipCtl.getValues(),
  })

  const load = ({ values }: GaugeLayer, kind: LayerKind) => {
    const inputs = panelInputs(values)
    gaugeCtl.load(values.gauge, gaugeConfig(kind, inputs.linear))
    valCtl.load(values.value, valueConfig(inputs.min, inputs.max, inputs.range))
    arcsCtl.load(values.arcs, arcsConfig(inputs.linear))
    cutoffsCtl.load(values.cutoffs, cutoffsConfig(inputs.min, inputs.max))
    ticksCtl.load(values.ticks, TICKS)
    textCtl.load(values.text, TEXT)
    needleCtl.load(values.needle, NEEDLE, { hidden: inputs.linear })
    dotCtl.load(values.dot, DOT)
    tooltipCtl.load(values.tooltip, TOOLTIP)
  }

  const current = useMemo(
    () =>
      mapLayers(composition, (layer) =>
        layer.id === selected
          ? withLive(layer, {
              gauge,
              value: val,
              arcs,
              cutoffs,
              ticks,
              text,
              needle,
              dot,
              tooltip,
            })
          : layer
      ),
    [
      composition,
      selected,
      gauge,
      val,
      arcs,
      cutoffs,
      ticks,
      text,
      needle,
      dot,
      tooltip,
    ]
  )

  const spec = useMemo(() => specOf(current), [current])
  const selectedLayer = findLayer(current, selected) ?? current.host

  const saved = () =>
    mapLayers(composition, (layer) =>
      layer.id === selected ? withLive(layer, readLive()) : layer
    )

  const selectLayer = (id: string) => {
    if (id === selected) return
    const next = saved()
    const layer = findLayer(next, id)
    if (!layer) return
    setComposition(next)
    setSelected(id)
    load(layer, kindOf(next, id))
  }

  const addLayer = () => {
    const next = saved()
    const layer = addedLayer(next)
    setComposition({ ...next, insets: [...next.insets, layer] })
    setSelected(layer.id)
    load(layer, "inset")
  }

  const removeLayer = (id = selected) => {
    if (kindOf(composition, id) === "host") return
    const next = saved()
    const rest = {
      ...next,
      insets: next.insets.filter((layer) => layer.id !== id),
    }
    setComposition(rest)
    if (id !== selected) return
    setSelected(rest.host.id)
    load(rest.host, "host")
  }

  const applyComposition = (next: Composition) => {
    setComposition(next)
    setSelected(next.host.id)
    setMode("manual")
    setPlayIn((n) => n + 1)
    load(next.host, "host")
  }

  const selectTemplate = (template: GaugeTemplate) => {
    writeStored(storageKeys.template, template.id)
    setActiveTemplate(template)
    applyComposition(templateComposition(template))
  }

  const restoreTemplate = useEffectEvent(() => {
    const stored = readStored(storageKeys.template)
    const template = gaugeTemplates.find((t) => t.id === stored)
    if (template) selectTemplate(template)
  })

  useEffect(() => {
    const frame = requestAnimationFrame(restoreTemplate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const reset = () => applyComposition(templateComposition(activeTemplate))

  const setValue = (v: number) => {
    valCtl.setValue("value", v)
    setMode("manual")
  }

  const setRange = ([from, to]: [number, number]) => {
    valCtl.setValue("from", from)
    setValue(to)
  }

  return {
    spec,
    stage: current.host.values.gauge.stage,
    hostValue: current.host.values.value.value,
    playIn,
    composition: current,
    selected,
    selectedLayer,
    hostSelected: kind === "host",
    selectLayer,
    addLayer,
    removeLayer,
    value: val,
    domain: { min, max },
    mode,
    setValue,
    setRange,
    setMode,
    activeTemplate,
    selectTemplate,
    reset,
  }
}
