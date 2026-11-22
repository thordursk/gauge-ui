import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

export type MarqueeProps = {
  children: ReactNode
  duration?: number
  reverse?: boolean
  className?: string
}

export const Marquee = ({
  children,
  duration,
  reverse = false,
  className,
}: MarqueeProps) => (
  <div
    className={cn(
      "flex w-max animate-marquee will-change-transform motion-reduce:animate-none",
      className
    )}
    style={
      {
        "--marquee-duration":
          duration === undefined ? undefined : `${duration}s`,
        animationDirection: reverse ? "reverse" : undefined,
      } as CSSProperties
    }
  >
    {children}
    {children}
  </div>
)
