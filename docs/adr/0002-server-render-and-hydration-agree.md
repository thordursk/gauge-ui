# Server render and hydration must agree

Every page, the studio and the example scenes included, is server-rendered and then hydrated. Anything the server can't know, or computes differently, would make the markup and the hydration pass disagree. So the first client render always reproduces the server's output, and client-only facts arrive a frame later. The price is a frame on a fallback (default template, default layout, idle machine, bare clock faces) before the real value shows.

- **Stored and media-query state.** `localStorage` (`lib/storage.ts`), `matchMedia` (`hooks/use-media-query.ts`) and the last-used template (`hooks/use-gauge-controllers.ts`) are never read during render. They go through `useSyncExternalStore` with a fixed server snapshot (`hooks/use-stored-value.ts`) or through a mount effect.
- **Reduced motion.** The server can't read `prefers-reduced-motion`. The still frame is applied in a `requestAnimationFrame` after hydration (`useEspressoSimulation`'s `held`, `useLaunchSimulation`'s `STILL`), not chosen in render or in a `useState` initialiser.
- **No `Math.random` on the first render.** `lap-simulation.ts` uses its own seeded generator (`seeded(7)`) and pre-runs the session with it. `monitor-dashboard.tsx` seeds its uptime history and builds a sine-based `START` backlog.
- **Fixed locale.** `site-header.tsx` and `rocket-launch.tsx` format with `"en-US"`, not the visitor's locale.
- **Theme.** `theme-toggle.tsx` renders both icons and lets the `.dark` class pick one, because the resolved theme is unknown on the server.
- **Clock.** `time-dashboard.tsx`'s `useNow` returns a `null` server snapshot.
- **Portals.** `GaugeTooltip` gates `createPortal(document.body)` on a `useSyncExternalStore` client check, not on `typeof document`.
- **Floating point.** `polar` (`components/gauge/math.ts`) and `lineScale` (`scale.ts`) round coordinates to three decimals, because trig can differ in the last bits between engines.
- **Strict-mode remounts.** `useStartOnView` (`time-dashboard.tsx`) starts timers in a cancellable `requestAnimationFrame`, so strict mode's mount, unmount and remount doesn't start them twice. Its timestamp is also on the same clock as `useFrameTime`.
