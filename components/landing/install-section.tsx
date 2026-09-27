import Link from "next/link"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CopyButton } from "@/components/copy-button"
import { PromptPicker } from "@/components/landing/prompt-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const REGISTRY_URL = "https://gauge-ui.vercel.app/r/gauge.json"

const runners = [
  { id: "npm", command: `npx shadcn@latest add ${REGISTRY_URL}` },
  { id: "pnpm", command: `pnpm dlx shadcn@latest add ${REGISTRY_URL}` },
  { id: "yarn", command: `yarn dlx shadcn@latest add ${REGISTRY_URL}` },
  { id: "bun", command: `bunx --bun shadcn@latest add ${REGISTRY_URL}` },
]

/** Prompts for building a gauge from the installed primitives. */
const prompts = [
  {
    title: "Speedometer with zones",
    prompt:
      "Using the primitives in @/components/gauge, build a speedometer from 0 to 240 km/h with green, amber and red zones, a pointer needle and tick labels every 40.",
  },
  {
    title: "Live metric",
    prompt:
      "Build a CPU usage gauge with @/components/gauge that runs from 0 to 100%, colours the arc by zone with zoneColor and springs between readings.",
  },
  {
    title: "Progress ring",
    prompt:
      "Using @/components/gauge, make a full-circle progress ring with no needle that tweens to each new value and shows the percentage in the middle.",
  },
  {
    title: "Nested gauges",
    prompt:
      "With @/components/gauge, make a car dashboard gauge: speed on the main dial and a small fuel gauge nested under the hub with GaugeInset.",
  },
]

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <Badge variant="secondary" className="border border-accent tabular-nums">
      {n}
    </Badge>
    <h3 className="text-base font-medium tracking-tight">{children}</h3>
  </div>
)

export const InstallSection = () => (
  <section
    id="install"
    className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-32"
  >
    <div className="flex max-w-xl flex-col gap-3">
      <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
        Install
      </h2>
    </div>

    <div className="flex flex-col gap-4">
      <Step n={1}>Add it with the shadcn CLI</Step>
      <Tabs defaultValue="npm" className="gap-3">
        <TabsList>
          {runners.map((runner) => (
            <TabsTrigger key={runner.id} value={runner.id}>
              {runner.id}
            </TabsTrigger>
          ))}
        </TabsList>
        {runners.map((runner) => (
          <TabsContent key={runner.id} value={runner.id}>
            <Card size="sm" className="p-2 shadow-none">
              <CardContent className="flex items-center gap-2 px-2">
                <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
                  <span className="text-muted-foreground select-none">$ </span>
                  {runner.command}
                </code>
                <CopyButton value={runner.command} label="Copy command" />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>

    <div className="flex flex-col gap-4">
      <Step n={2}>Build your gauge</Step>
      <Tabs defaultValue="agent" className="gap-3">
        <TabsList>
          <TabsTrigger value="agent">Ask your agent</TabsTrigger>
          <TabsTrigger value="studio">Use the studio</TabsTrigger>
        </TabsList>
        <TabsContent value="agent">
          <PromptPicker prompts={prompts} />
        </TabsContent>
        <TabsContent value="studio">
          <Card size="sm" className="shadow-none">
            <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardDescription className="leading-relaxed">
                Design your own gauge in the studio, tweak it live, then copy
                the code into your project.
              </CardDescription>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/studio" />}
                className="shrink-0"
              >
                Open the studio
                <HugeiconsIcon
                  icon={ArrowRight02Icon}
                  strokeWidth={2}
                  data-icon="inline-end"
                />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </section>
)
