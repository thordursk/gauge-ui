import {
  RADIUS,
  buildInsetSpec,
  buildSpec,
  defaultPanelValues,
  mergeValues,
  withoutMeta,
  type LayerKind,
  type PanelValues,
} from "@/lib/gauge-panels"
import type { GaugeInsetSpec, GaugeSpec } from "@/lib/gauge-spec"

export type GaugeLayer = {
  id: string
  name: string
  values: PanelValues
}

export type Composition = {
  host: GaugeLayer
  insets: GaugeLayer[]
}

export const HOST_ID = "main"

export const hostLayer = (values: PanelValues): GaugeLayer => ({
  id: HOST_ID,
  name: "Main",
  values,
})

export const layerName = (id: string) =>
  id.charAt(0).toUpperCase() + id.slice(1)

export const kindOf = (composition: Composition, id: string): LayerKind =>
  id === composition.host.id ? "host" : "inset"

export const findLayer = (composition: Composition, id: string) =>
  kindOf(composition, id) === "host"
    ? composition.host
    : composition.insets.find((layer) => layer.id === id)

export const mapLayers = (
  { host, insets }: Composition,
  update: (layer: GaugeLayer) => GaugeLayer
): Composition => ({ host: update(host), insets: insets.map(update) })

export const insetOf = (layer: GaugeLayer): GaugeInsetSpec => {
  const { position, scale } = layer.values.gauge.placement
  return {
    name: layer.id,
    x: position.x * RADIUS,
    y: -position.y * RADIUS,
    scale,
    value: layer.values.value.value,
    spec: buildInsetSpec(layer.values),
  }
}

export const specOf = ({ host, insets }: Composition): GaugeSpec => ({
  ...buildSpec(host.values),
  insets: insets.length > 0 ? insets.map(insetOf) : undefined,
})

export const withLive = (layer: GaugeLayer, live: PanelValues): GaugeLayer => ({
  ...layer,
  values: mergeValues(layer.values, withoutMeta(live)),
})

export const addedLayer = ({ host, insets }: Composition): GaugeLayer => {
  const taken = [host, ...insets]
  let n = taken.length + 1
  while (taken.some((layer) => layer.id === `gauge${n}`)) n++
  return { id: `gauge${n}`, name: `Gauge ${n}`, values: defaultPanelValues() }
}
