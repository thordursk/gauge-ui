import {
  RADIUS,
  buildSpec,
  defaultPanelValues,
  mergeValues,
  withoutMeta,
  type PanelValues,
} from "@/lib/gauge-panels"
import type { GaugeInsetSpec, GaugeSpec } from "@/lib/gauge-spec"

export type GaugeLayer = {
  id: string
  name: string
  values: PanelValues
}

export const HOST_ID = "main"

export const hostLayer = (values: PanelValues): GaugeLayer => ({
  id: HOST_ID,
  name: "Main",
  values,
})

export const layerName = (id: string) =>
  id.charAt(0).toUpperCase() + id.slice(1)

export const insetOf = (layer: GaugeLayer): GaugeInsetSpec => {
  const { position, scale } = layer.values.gauge.placement
  return {
    name: layer.id,
    x: position.x * RADIUS,
    y: -position.y * RADIUS,
    scale,
    value: layer.values.value.value,
    spec: buildSpec(layer.values),
  }
}

export const specFromLayers = (layers: GaugeLayer[]): GaugeSpec => ({
  ...buildSpec(layers[0].values),
  insets: layers.length > 1 ? layers.slice(1).map(insetOf) : undefined,
})

export const withLive = (layer: GaugeLayer, live: PanelValues): GaugeLayer => ({
  ...layer,
  values: mergeValues(layer.values, withoutMeta(live)),
})

export const addedLayer = (layers: GaugeLayer[]): GaugeLayer => {
  let n = layers.length + 1
  while (layers.some((layer) => layer.id === `gauge${n}`)) n++
  return { id: `gauge${n}`, name: `Gauge ${n}`, values: defaultPanelValues() }
}
