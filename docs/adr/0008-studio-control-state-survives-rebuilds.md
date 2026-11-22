# Studio control state survives rebuilds

The studio's control panels (`lib/controls.ts`, `hooks/use-control-panel.ts`, `lib/gauge-panels.ts`) are rebuilt on every render and whenever the domain changes. A user's edits must survive that, and survive strict mode's remounts.

- **Lenient normalisation.** `ControlsStore.setPanel`/`normalizeValue` keep existing values. Sliders are clamped and snapped. Selects fall back only when their option is gone. Values whose control has disappeared, such as a custom colour's hex, are kept. A transition keeps whichever shape (spring or easing) the user switched it to. As a result, the store can hold values that have no control at the moment.
- **Retained on unmount.** `unregisterPanel` moves values into `retained` and `registerPanel` prefers them, so strict mode's mount, unmount and remount, or hiding a panel, doesn't reset edits. Values for panels that never return stay in memory for the session.
- **Zones keep panel order.** `buildSpec` clamps each cutoff at or above the previous one and forces the last zone to `max`. Sorting the cutoffs would make colours jump between zones while a slider is dragged. A cutoff that's out of order collapses to an empty zone.
- **`toggle()` widens booleans.** Panel configs use `satisfies ControlConfig`, which keeps literal types, so a bare `show: true` would type as `true`. The identity `toggle(value): boolean` widens it.
- **Storage is best-effort and syncs within the tab.** `readStored`/`writeStored` swallow the errors browsers throw when storage is disabled or full, so a preference just doesn't persist. The `storage` event only reaches other tabs, so `subscribeStored` also keeps a local listener set that `writeStored` notifies.
