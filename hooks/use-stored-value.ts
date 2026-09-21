import { useSyncExternalStore } from "react"

import { readStored, subscribeStored } from "@/lib/storage"

/**
 * The value stored under `key`, or `fallback` where there is none. The server
 * and the hydration pass are given the fallback, as they must be, and the
 * stored value arrives in the render right after; a write from anywhere —
 * this tab or another — brings every reader of the key along with it.
 */
export const useStoredValue = (key: string, fallback: string) =>
  useSyncExternalStore(
    subscribeStored,
    () => readStored(key) ?? fallback,
    () => fallback
  )
