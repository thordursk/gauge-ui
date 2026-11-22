import { useSyncExternalStore } from "react"

import { readStored, subscribeStored } from "@/lib/storage"

export const useStoredValue = (key: string, fallback: string) =>
  useSyncExternalStore(
    subscribeStored,
    () => readStored(key) ?? fallback,
    () => fallback
  )
