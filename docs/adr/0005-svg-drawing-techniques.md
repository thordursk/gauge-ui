# SVG drawing techniques

These are the drawing choices in `components/gauge` and the scenes that work around how SVG behaves, which a cleanup would otherwise undo.

- **Round ends are discs.** `stroke-linecap` applies to both ends of a path, so `GaugeZones` (`arcs.tsx`) draws segments with butt caps and adds `<circle>` discs of radius `width / 2` wherever an end is rounded. That's what lets the outer `endCap` differ from the joints.
- **Arcs are split at 180°.** `arcPath` (`math.ts`) emits pieces of at most 180° with `large-arc-flag` 0. A single `A` command is ambiguous near 180° and draws nothing when start and end coincide, so a 360° ring would vanish.
- **Angles run past 360.** Gauge degrees put twelve o'clock at 180, so a ring that starts there ends at 540. The studio's `endAngle` slider (`lib/gauge-panels.ts`) spans 180–540, and the Battery, Sprint, Orrery and Chronograph templates rely on that.
- **Mask ids are sanitised.** `GaugeNeedle` strips non-word characters from `useId()`, because React's ids aren't safe inside `url(#…)`.
- **Nested rings use `offset`, not scale.** `GaugeInset` scales strokes, dots and text along with the gauge. `planetOrbit` (`lib/gauge-templates.ts`) and `ActivityRings` (`health-dashboard.tsx`) keep every ring at scale 1 and pull it in with `offset`, so the strokes stay equal.
- **Bar lengths track rendered width.** `LinearGauge`'s `length` is in SVG units and the SVG scales to its CSS box. The scenes therefore pick lengths (`LONG`, `SHORT`, `HALF`, `FULL`, `UPTIME_LENGTH`, `SONG_LENGTH`) close to the width the bar actually renders at, so `fontSize` renders near its nominal size. Changing a grid column means retuning the length.
