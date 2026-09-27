import Link from "next/link"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { HeroBackdrop } from "@/components/landing/hero-backdrop"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const HeroSection = () => (
  <section className="relative isolate overflow-hidden">
    <HeroBackdrop />
    <div className="mx-auto flex min-h-144 max-w-4xl flex-col items-center justify-center px-4 pt-16 pb-32 text-center sm:min-h-[44rem] sm:px-6 sm:pt-20 sm:pb-44">
      <div className="flex flex-col items-center gap-6">
        <Badge variant="outline" className="bg-background">
          A shadcn registry
        </Badge>
        <h1 className="max-w-2xl text-5xl font-semibold tracking-tighter text-balance sm:text-6xl">
          Build any gauge you can imagine
        </h1>
        <p className="max-w-lg text-lg text-balance text-muted-foreground">
          Composable SVG gauge components for React, ready to integrate into
          your projects.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button nativeButton={false} render={<a href="#install" />}>
            Get started
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/studio" />}
          >
            Open the studio
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              strokeWidth={2}
              data-icon="inline-end"
            />
          </Button>
        </div>
      </div>
    </div>
  </section>
)
