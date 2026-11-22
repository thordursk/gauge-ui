import Link from "next/link"

import { cn } from "@/lib/utils"

const swing =
  "duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"

export const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    aria-hidden
    className={cn("size-5 shrink-0", className)}
  >
    <path
      d="M6.34 18.66 A8 8 0 1 1 17.66 18.66"
      strokeWidth={2.5}
      opacity={0.3}
    />
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
