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
  /** Stable id; it is the key values are stored and rendered under. */
  id: string
  /** Whether the panel's section in `ControlsRoot` starts closed. */
  defaultCollapsed?: boolean
}

export type ControlPanelController<T extends ControlConfig> = {
  values: ResolvedValues<T>
  setValue: (path: string, value: ControlValue) => void
  setValues: (updates: ControlValueUpdates<T>) => void
  getValues: () => ResolvedValues<T>
}

/**
 * Registers a panel with the controls store and returns a controller over it:
 * live resolved values, plus setters for driving the panel from outside, the
 * way loading a layer or a template does. `ControlsRoot` renders every panel
 * registered this way.
 */
export const useControlPanel = <T extends ControlConfig>(
  name: string,
  config: T,
  options: ControlPanelOptions
): ControlPanelController<T> => {
  const panelId = options.id
  const defaultCollapsed = options.defaultCollapsed

  /* The config is rebuilt every render, so it is compared by content: only a
     real change — a slider range following the domain, a control appearing —
     should reach the store. */
  const serializedConfig = JSON.stringify(config)

  /* The setters below want the latest config without listing it as a
     dependency, or they would be remade every render along with it. */
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  useEffect(() => {
    ControlsStore.registerPanel(panelId, name, configRef.current, {
      defaultCollapsed,
    })
    return () => ControlsStore.unregisterPanel(panelId)
  }, [panelId, name, defaultCollapsed])

  /* The register effect above already carried the mount's config into the
     store; this one only follows later content changes. */
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    ControlsStore.updatePanel(panelId, name, configRef.current, {
      defaultCollapsed,
    })
  }, [panelId, name, serializedConfig, defaultCollapsed])

  const subscribe = useCallback(
    (listener: () => void) => ControlsStore.subscribe(panelId, listener),
    [panelId]
  )
  const getSnapshot = useCallback(
    () => ControlsStore.getValues(panelId),
    [panelId]
  )
  const flat = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  /* The serialized text stands in for the config, so the memo follows its
     content rather than its per-render identity and the resolved values keep
     theirs while nothing has changed. */
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
