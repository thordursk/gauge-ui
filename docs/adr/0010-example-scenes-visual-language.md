# Example scenes: one ink, toy models

The example scenes (`components/examples/`) show what the primitives can do. They aren't instruments.

- **One ink.** Every scene draws in a single `INK` (`var(--foreground)`), thinned with `fadeColor` for quieter tones, as the studio templates do. The Activity rings in `health-dashboard.tsx` are told apart by opacity, not red, green and blue, so they hold contrast in both themes. Adding brand colours would break theme parity.
- **Cuts are painted in the card's colour.** Notches and segment gaps are drawn in the colour behind them. `Card` (`components/ui/card.tsx`) paints `bg-background`, so cuts must be `var(--background)`. In dark mode `--card` is a different grey. See the issue about the scenes that still use `var(--card)`.
- **Simulations are toys, but get the shape right.** The espresso, flight, lap and launch simulations aren't calibrated against anything. They only have to move the gauges the way the real thing does. Two details are load-bearing anyway. `sumDb` (`music-studio.tsx`) adds levels as power, because decibels are logarithmic. The lap driver latches onto a corner once braking is needed (`Car.braking` in `lap-simulation.ts`) as a hysteresis guard, so the pedals don't oscillate around `BRAKE_PLAN`.
