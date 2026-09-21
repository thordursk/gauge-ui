/**
 * The handful of studio choices that outlive a visit, kept in `localStorage`.
 * Both ends are wrapped: storage throws rather than answering when a browser
 * has it switched off or its quota is full, and a remembered preference is
 * not worth taking the studio down for.
 *
 * Nothing here may be read straight out while rendering. The server has no
 * storage, so a stored value read at the first render would leave the markup
 * and the hydration pass disagreeing. Read it through `useStoredValue`, which
 * hands the first render the fallback and the stored value the moment after,
 * or in an effect for the values that drive something rather than are one.
 */

/** Namespaced, so the studio shares an origin with anything else cleanly. */
export const storageKeys = {
  /** Id of the template the studio was last on. */
  template: "gauge-ui:template",
  /** Whether the controls sidebar is open: `shown` or `hidden`. */
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
  } catch {
    /* Private modes and full quotas: the choice just does not stick. */
  }
  announce()
}

/* Writes from this tab, which the `storage` event does not report: it is only
   ever fired at the *other* tabs on the origin. Both are passed on, so every
   reader of a key moves together however many of them there are. */
const listeners = new Set<() => void>()

const announce = () => listeners.forEach((listener) => listener())

export const subscribeStored = (onChange: () => void) => {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}
