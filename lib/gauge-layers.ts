/**
 * The studio edits a composition of gauges: one host and any number of insets
 * inside it. A layer is one of those gauges, held as a full set of panel
 * values, and this is where a list of them turns into the single `GaugeSpec`
 * the preview draws and the code generator prints.
 *
 * Only the selected layer is in the panels at any moment. The rest keep their
 * values here, which is also why every layer stores a complete set: whatever
 * its own panel does not show — the stage colour on an inset, the placement on
 * the host — is still there when the layer comes round again.
 */

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
  /** Unique. An inset's is the prop its value arrives on in generated code. */
  id: string
  /** What the layer is called on the chips above the value slider. */
  name: string
  values: PanelValues
}

/** The gauge every composition starts with, the one the insets sit inside. */
export const HOST_ID = "main"

export const hostLayer = (values: PanelValues): GaugeLayer => ({
  id: HOST_ID,
  name: "Main",
  values,
})

/** `fuel` on the chip, and in the generated code, reads as Fuel. */
export const layerName = (id: string) =>
  id.charAt(0).toUpperCase() + id.slice(1)

/** An inset spec for a layer, placed by its own Gauge panel. */
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

/** The whole composition: the first layer is the gauge, the rest its insets. */
export const specFromLayers = (layers: GaugeLayer[]): GaugeSpec => ({
  ...buildSpec(layers[0].values),
  insets: layers.length > 1 ? layers.slice(1).map(insetOf) : undefined,
})

/**
 * A layer with whatever the live panels hold laid over it. The panels carry
 * only the controls their layer's kind shows, so the stored values underneath
 * supply the rest.
 */
export const withLive = (layer: GaugeLayer, live: PanelValues): GaugeLayer => ({
  ...layer,
  values: mergeValues(layer.values, withoutMeta(live)),
})

/** A new inset at the panel defaults, under an id nothing else has taken. */
export const addedLayer = (layers: GaugeLayer[]): GaugeLayer => {
  let n = layers.length + 1
  while (layers.some((layer) => layer.id === `gauge${n}`)) n++
  return { id: `gauge${n}`, name: `Gauge ${n}`, values: defaultPanelValues() }
}
