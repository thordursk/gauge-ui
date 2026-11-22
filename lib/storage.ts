export const storageKeys = {
  template: "gauge-ui:template",
  controls: "gauge-ui:controls",
} as const

export const readStored = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {}
  announce()
}

const listeners = new Set<() => void>()

const announce = () => listeners.forEach((listener) => listener())

export type ControlsVisibility = "shown" | "hidden"

export const readControlsVisibility = (): ControlsVisibility =>
  readStored(storageKeys.controls) === "hidden" ? "hidden" : "shown"

export const writeControlsVisibility = (visibility: ControlsVisibility) =>
  writeStored(storageKeys.controls, visibility)

export const subscribeStored = (onChange: () => void) => {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}
