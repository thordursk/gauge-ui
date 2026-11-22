# Example deep links reset the hash

A link to `#<example-id>`, such as `#music-studio`, opens that tab in `ExamplesSection` (`components/landing/examples-section.tsx`) and scrolls to it. The handler then swaps the hash for `#examples` with `history.replaceState`. Without that swap, following the same link a second time wouldn't change the hash, so no `hashchange` would fire and nothing would happen. The scroll is instant on first load and for reduced-motion visitors, and smooth otherwise.
