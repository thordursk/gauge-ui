# GaugeTooltip positions itself imperatively in a body portal

`GaugeTooltip` (`components/gauge/tooltip.tsx`) has to follow a point that moves every frame while the value animates, escape any `overflow` clipping, and stay unaffected by inset scaling.

- **Portal and page coordinates.** The bubble portals to `document.body` and is placed absolutely in page coordinates computed from the SVG's `getScreenCTM`. With page rather than fixed coordinates it rides a scroll natively instead of lagging a frame. A wrapper div holds the position, so the bubble's own `transform` stays free for its entrance animation. The cost is manual scroll and resize listeners.
- **Direct DOM writes every render.** `place()` writes `left`/`top` straight to the DOM from a `useEffectEvent`, in a `useLayoutEffect` with no deps array. Going through state would re-render for every pixel. Adding a deps array would freeze the bubble mid-animation.
- **Collisions.** Measured spill is capped at the bubble's size, so a far off-screen point doesn't flip-flop as it scrolls. The bubble flips one axis at a time, only when the other side spills less, and slides only horizontally. Sliding vertically would make it creep against its point along the scroll axis. A bubble can therefore still overflow vertically.
- **Press tracking on `window`.** `GaugeControl` calls `setPointerCapture`, which fires `pointerleave` on the SVG and sends later moves elsewhere. While a press is held, the tooltip listens on `window`, which also makes it work on touch, where there's no hover.
