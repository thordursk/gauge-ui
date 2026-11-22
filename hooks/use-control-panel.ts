import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"

import {
  ControlsStore,
  flattenUpdates,
  resolveValues,
  type ControlConfig,
  type ControlValue,
  type ControlValueUpdates,
  type PanelOptions,
  type ResolvedValues,
} from "@/lib/controls"

export type ControlPanelOptions = PanelOptions & { id: string }

export type ControlPanelController<T extends ControlConfig> = {
  values: ResolvedValues<T>
  setValue: (path: string, value: ControlValue) => void
  getValues: () => ResolvedValues<T>
  load: (
    values: ControlValueUpdates<T>,
    config: T,
    options?: PanelOptions
  ) => void
}

export const useControlPanel = <T extends ControlConfig>(
  name: string,
  config: T,
  { id, defaultCollapsed, hidden }: ControlPanelOptions
): ControlPanelController<T> => {
  useEffect(() => {
    ControlsStore.setPanel(id, name, config, { defaultCollapsed, hidden })
  }, [id, name, config, defaultCollapsed, hidden])

  useEffect(() => () => ControlsStore.unregisterPanel(id), [id])

  const subscribe = useCallback(
    (listener: () => void) => ControlsStore.subscribe(id, listener),
    [id]
  )
  const getSnapshot = useCallback(() => ControlsStore.getValues(id), [id])
  const flat = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const values = useMemo(() => resolveValues(config, flat), [config, flat])

  const setValue = useCallback(
    (path: string, value: ControlValue) =>
      ControlsStore.updateValue(id, path, value),
    [id]
  )
  const getValues = useCallback(
    () => resolveValues(config, ControlsStore.getValues(id)),
    [id, config]
  )
  const load = useCallback(
    (values: ControlValueUpdates<T>, next: T, options?: PanelOptions) =>
      ControlsStore.loadPanel(id, next, flattenUpdates(next, values), options),
    [id]
  )

  return useMemo(
    () => ({ values, setValue, getValues, load }),
    [values, setValue, getValues, load]
  )
}

export const useControlValue = (panelId: string, path: string) => {
  const subscribe = useCallback(
    (listener: () => void) => ControlsStore.subscribe(panelId, listener),
    [panelId]
  )
  const read = () => ControlsStore.getValues(panelId)[path]
  return useSyncExternalStore(subscribe, read, read)
}
