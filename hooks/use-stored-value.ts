import { useSyncExternalStore } from "react"

import { subscribeStored } from "@/lib/storage"

export const useStoredValue = <T>(read: () => T, serverValue: T) =>
  useSyncExternalStore(subscribeStored, read, () => serverValue)
