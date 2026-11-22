"use client"

import type { CSSProperties } from "react"

import { GaugePreview } from "@/components/gauge-preview"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"
import { cn } from "@/lib/utils"

const previews = gaugeTemplates.map((template) => ({
  id: template.id,
  ...templatePreview(template),
}))

const ROWS = 5
const PER_ROW = 7

const rows = Array.from({ length: ROWS }, (_, row) =>
  Array.from(
    { length: PER_ROW },
    (_, i) => previews[(row * 5 + i) % previews.length]
  )
)

export const HeroBackdrop = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-45 select-none perspective-[1000px] dark:opacity-35",
      className
    )}
    style={{
      maskImage:
        "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent), radial-gradient(ellipse 45% 50% at 50% 44%, transparent 30%, black 100%)",
      maskComposite: "intersect",
    }}
  >
    <div
      className="absolute top-1/2 left-1/2 flex w-[max(180%,90rem)] flex-col gap-4 transform-3d"
      style={{
        transform: "translate(-50%, -50%) rotateX(42deg) rotateZ(-12deg)",
      }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex w-max animate-marquee will-change-transform motion-reduce:animate-none"
          style={
            {
              "--marquee-duration": `${70 + i * 12}s`,
              animationDirection: i % 2 === 1 ? "reverse" : undefined,
            } as CSSProperties
          }
        >
          {[...row, ...row].map((preview, j) => (
            <div key={j} className="size-52 shrink-0 p-5 sm:size-80">
              <GaugePreview
                spec={preview.spec}
                value={preview.value}
                transition={false}
                tooltips={false}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)
