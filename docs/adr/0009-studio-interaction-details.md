# Studio interaction details

These are small UX decisions in the studio shell that look like noise but each fix a real problem.

- **No controls on phones.** The controls sidebar renders only from `md` up (`SIDEBAR_QUERY` in `gauge-studio.tsx`). Below that, the `ControlBar` is the whole UI, because building a composition control by control isn't a phone task. Adding a mobile drawer would reverse this decision.
- **Safe areas.** The root viewport sets `viewportFit: "cover"` (`app/layout.tsx`), so the full-height studio paints under notches. Each element that reaches an edge pads itself back with `env(safe-area-inset-*)`.
- **Initial focus by open type.** The layer, play-mode and template popovers pass `initialFocus={(openType) => openType === "keyboard"}`. Pointer opens don't flash a focus ring on the first row, and keyboard opens still move focus into the content.
- **Segmented controls always have a selection.** Base UI's `ToggleGroup` reports `[]` when the active item is clicked again. `segmented-control.tsx` ignores changes that don't name a known option.
- **Template shortcuts.** `template-nav.tsx` binds `[` and `]` everywhere outside text fields, but binds the arrow keys only when focus is on `body` or inside the nav, so they never steal input from a slider or the gauge control.
- **Fixed-height template picker.** `template-picker.tsx` uses a fixed height, not `max-height`. A popover that resizes gets repositioned by Base UI's collision handling and jumps away from its trigger. The square card preview adds `min-h-0` next to `aspect-square`, because an aspect-ratio box gets a content-based minimum that a vertical bar would stretch.
- **One tooltip provider for the header.** `gauge-studio.tsx` wraps the header's icon tooltips in one `TooltipProvider`, so moving between buttons shows the next tooltip at once.
- **Slider structure.** The dial slider (`components/ui/slider.tsx`) keeps its track in normal flow, because Base UI writes `position: relative` inline. It keeps a zero-size `Thumb` as the keyboard and screen-reader target behind the decorative handle. The default slider puts its vertical room in padding on `Control`, which receives pointer-down, so the whole row is a touch target.
