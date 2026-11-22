import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"

import {
  ControlsStore,
  flattenUpdates,
  resolveValues,
  type ControlConfig,
  type ControlValue,
  type ControlValueUpdates,
  type ResolvedValues,
} from "@/lib/controls"

export type ControlPanelOptions = {
  id: string
  defaultCollapsed?: boolean
  hidden?: boolean
}

export type ControlPanelController<T extends ControlConfig> = {
  values: ResolvedValues<T>
  setValue: (path: string, value: ControlValue) => void
  setValues: (updates: ControlValueUpdates<T>) => void
  getValues: () => ResolvedValues<T>
}

export const useControlPanel = <T extends ControlConfig>(
  name: string,
  config: T,
  options: ControlPanelOptions
): ControlPanelController<T> => {
  const panelId = options.id
  const defaultCollapsed = options.defaultCollapsed
  const hidden = options.hidden

  const serializedConfig = JSON.stringify(config)

  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  useEffect(() => {
    ControlsStore.registerPanel(panelId, name, configRef.current, {
      defaultCollapsed,
      hidden,
    })
    return () => ControlsStore.unregisterPanel(panelId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, name, defaultCollapsed])

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    ControlsStore.updatePanel(panelId, name, configRef.current, {
      defaultCollapsed,
      hidden,
    })
  }, [panelId, name, serializedConfig, defaultCollapsed, hidden])

  const subscribe = useCallback(
    (listener: () => void) => ControlsStore.subscribe(panelId, listener),
    [panelId]
  )
  const getSnapshot = useCallback(
    () => ControlsStore.getValues(panelId),
    [panelId]
  )
  const flat = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const values = useMemo(
    () => resolveValues(config, flat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flat, serializedConfig]
  )

  const setValue = useCallback(
    (path: string, value: ControlValue) =>
      ControlsStore.updateValue(panelId, path, value),
    [panelId]
  )
  const setValues = useCallback(
    (updates: ControlValueUpdates<T>) =>
      ControlsStore.updateValues(
        panelId,
        flattenUpdates(configRef.current, updates)
      ),
    [panelId]
  )
  const getValues = useCallback(
    () => resolveValues(configRef.current, ControlsStore.getValues(panelId)),
    [panelId]
  )

  return useMemo(
    () => ({ values, setValue, setValues, getValues }),
    [values, setValue, setValues, getValues]
  )
}
