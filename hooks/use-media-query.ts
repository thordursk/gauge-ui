import { useSyncExternalStore } from "react"

/**
 * Whether the given CSS media query currently matches. The server and the
 * hydration pass use `serverMatches`, so pick the layout most visitors get.
 */
export const useMediaQuery = (query: string, serverMatches = true) =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverMatches
  )
