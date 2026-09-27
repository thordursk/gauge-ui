import Link from "next/link"

import { cn } from "@/lib/utils"

/** A spring's overshoot, as a curve, so the swing lands with a little bounce. */
const swing =
  "duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"

/**
 * The Gauge UI mark: a three-quarter dial with its arc filled most of the way
 * round and the needle on the fill's head. Drawn in `currentColor`, so it
 * takes whatever colour the text around it has.
 *
 * Put `group/logo` on whatever the mark sits in, a link usually, and hovering
 * or focusing it swings the needle further round and fills the arc to match.
 */
export const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    aria-hidden
    className={cn("size-5 shrink-0", className)}
  >
    {/* The whole sweep, 135° to 45° clockwise round (12, 13). */}
    <path
      d="M6.34 18.66 A8 8 0 1 1 17.66 18.66"
      strokeWidth={2.5}
      opacity={0.3}
    />
    {/* The same sweep again, measured in degrees and dashed down to the
        first 165 of its 270, which puts the head at 300°. Hovered, the
        offset drops by 45 to meet the needle's 45° swing. */}
    <path
      d="M6.34 18.66 A8 8 0 1 1 17.66 18.66"
      pathLength={270}
      strokeWidth={2.5}
      strokeDasharray={270}
      strokeDashoffset={105}
      className={cn(
        "transition-[stroke-dashoffset] group-hover/logo:[stroke-dashoffset:60] group-focus-visible/logo:[stroke-dashoffset:60]",
        swing
      )}
    />
    {/* Pivots on the hub, so it stays on the fill's head as both move. */}
    <path
      d="M12 13 L14.75 8.24"
      strokeWidth={2}
      style={{ transformOrigin: "12px 13px", transformBox: "view-box" }}
      className={cn(
        "transition-transform group-hover/logo:rotate-45 group-focus-visible/logo:rotate-45",
        swing
      )}
    />
    <circle cx={12} cy={13} r={1.75} fill="currentColor" stroke="none" />
  </svg>
)

/** The mark and the name together, linking home. The landing header and the
    studio both use it, so the two stay the same. */
export const LogoLink = ({ className }: { className?: string }) => (
  <Link
    href="/"
    className={cn(
      "group/logo flex items-center gap-2 text-base font-semibold tracking-tight",
      className
    )}
  >
    <Logo />
    Gauge UI
  </Link>
)
