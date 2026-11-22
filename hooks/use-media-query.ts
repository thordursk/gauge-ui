import { useSyncExternalStore } from "react"

type Query = string | (() => string)

const resolve = (query: Query) =>
  typeof query === "function" ? query() : query

export const themeMinWidth = (token: string) =>
  `(min-width: ${getComputedStyle(document.documentElement).getPropertyValue(token).trim()})`

export const useMediaQuery = (query: Query, serverMatches = true) =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(resolve(query))
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(resolve(query)).matches,
    () => serverMatches
  )
