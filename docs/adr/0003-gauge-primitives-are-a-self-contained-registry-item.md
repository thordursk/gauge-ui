# Gauge primitives are a self-contained registry item

`components/gauge/*` is distributed as a shadcn registry item (`registry.json`). Users copy the source into their own project, with no runtime dependencies beyond React and `cn`. Everything the primitives need therefore lives inside that folder, and design choices favour working without measurement, animation libraries or extra packages.

- **Types and formatters live in `components/gauge`.** `Zone`, `FontFamily`, `zoneColor`, `clockLabel` and the rest are defined there. `lib/gauge-spec.ts` only re-exports them for the studio. Moving them into `lib` would break registry installs.
- **`components/gauge/utils.ts` is framework-free.** Its helpers are emitted into the code the studio generates (`lib/gauge-code.ts`), so they may not import React or the DOM.
- **Springs match motion without depending on it.** `springPhysics` (`transition.ts`) maps `visualDuration`/`bounce` to stiffness and damping with motion's own formula, including its 1.2 factor and 0.05 damping floor. A spring tuned in motion feels the same here.
- **Padding is explicit, not measured.** `Gauge` and `LinearGauge` size their `viewBox` from a `padding` prop. Measuring children (`getBBox`) would only work after client layout, which means a hydration mismatch or a layout shift. `LinearGauge` takes per-side padding because content above and below a bar rarely matches.
- **`GaugeControl`'s `onChange` is typed `Widen<V>`.** TypeScript infers a literal type for `V` from `value={42}`, which would make `onChange` accept only `42`.
