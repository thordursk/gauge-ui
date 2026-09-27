import { HeroBackdrop } from "@/components/landing/hero-backdrop"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * The hero, restaged at fixed image sizes for a headless browser to
 * screenshot. `?variant=og` (the default) is the 1200×630 social card and
 * `?variant=header` the wide README banner; `?theme=dark` flips both. Not
 * linked from anywhere and of no use to a visitor, so it stays out of
 * search results.
 */
export const metadata = { robots: { index: false, follow: false } }

const stages = {
  og: { width: 1200, height: 630 },
  header: { width: 1520, height: 500 },
} as const

export default async function OgStagePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const variant = params.variant === "header" ? "header" : "og"
  const { width, height } = stages[variant]

  return (
    <div id="stage" className={cn(params.theme === "dark" && "dark")}>
      <div
        className="relative isolate flex flex-col items-center justify-center overflow-hidden bg-background text-center text-foreground"
        style={{ width, height }}
      >
        <HeroBackdrop />
        {variant === "og" ? (
          <div className="flex flex-col items-center gap-7">
            <div className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <Logo className="size-7" />
              Gauge UI
            </div>
            <h1 className="max-w-3xl text-7xl font-semibold tracking-tighter text-balance">
              Build any gauge you can imagine
            </h1>
            <p className="max-w-xl text-2xl text-balance text-muted-foreground">
              Composable SVG gauge components for React, distributed as a
              shadcn registry.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <Badge variant="outline" className="bg-background">
              A shadcn registry
            </Badge>
            <div className="flex items-center gap-4">
              <Logo className="size-14" />
              <span className="text-6xl font-semibold tracking-tighter">
                Gauge UI
              </span>
            </div>
            <p className="max-w-xl text-xl text-balance text-muted-foreground">
              Composable SVG gauge components for React.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
