"use client"

import { useMemo, useState } from "react"
import {
  Refresh01Icon,
  SidebarRightIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AnimatedGauge } from "@/components/animated-gauge"
import { CodeDrawer } from "@/components/code-drawer"
import { ControlBar } from "@/components/control-bar"
import { ControlsRoot } from "@/components/controls/controls-root"
import { CopyValuesButton } from "@/components/copy-values-button"
import { LogoLink } from "@/components/logo"
import { TemplateNav } from "@/components/template-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGaugeControllers } from "@/hooks/use-gauge-controllers"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useStoredValue } from "@/hooks/use-stored-value"
import { gaugeToCode } from "@/lib/gauge-code"
import { GaugeControl, clamp } from "@/components/gauge"
import { css, stepFor, type PlayMode } from "@/lib/gauge-panels"
import {
  readControlsVisibility,
  writeControlsVisibility,
} from "@/lib/storage"

const SIDEBAR_QUERY = "(min-width: 48rem)"

export const GaugeStudio = () => {
  const {
    spec,
    stage,
    hostValue,
    sweepKey,
    layers,
    selected,
    selectLayer,
    addLayer,
    removeLayer,
    value: val,
    domain: { min, max },
    setValue,
    setRange,
    setMode,
    activeTemplate,
    selectTemplate,
    reset,
  } = useGaugeControllers()

  const code = useMemo(() => gaugeToCode(spec), [spec])
  const [showCode, setShowCode] = useState(false)
  const hasSidebar = useMediaQuery(SIDEBAR_QUERY)
  const showControls =
    useStoredValue(readControlsVisibility, "shown") === "shown"

  const toggleControls = () =>
    writeControlsVisibility(showControls ? "hidden" : "shown")

  const current = clamp(val.value, min, max)
  const mode = val.mode as PlayMode
  const shown = selected === 0 ? current : hostValue

  const gauge = (
    <AnimatedGauge
      key={sweepKey}
      spec={spec}
      value={shown}
      mode={mode}
      period={val.period}
      amplitude={val.amplitude}
      sweepIn
    />
  )

  const controlProps = (control: NonNullable<typeof spec.control>) => ({
    min: spec.domain.min,
    max: spec.domain.max,
    step: control.step,
    ...(spec.domain.shape === "linear"
      ? {
          orientation: spec.domain.orientation,
          length: spec.domain.length,
          className:
            spec.domain.orientation === "vertical"
              ? "h-full max-w-full"
              : "w-full max-h-full",
        }
      : {
          startAngle: spec.domain.startAngle,
          endAngle: spec.domain.endAngle,
          className: "size-[min(100cqw,100cqh)]",
        }),
    label: spec.title.show ? spec.title.text : "Value",
    knob: control.knob,
    disabled: selected !== 0,
  })

  return (
    <div className="flex h-svh flex-col overflow-hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:flex-row">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-4">
          <h1 className="mr-auto">
            <LogoLink />
          </h1>
          <TemplateNav
            selected={activeTemplate}
            onSelect={selectTemplate}
            className="w-auto"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    onClick={reset}
                    aria-label="Reset"
                  />
                }
              >
                <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {activeTemplate
                  ? `Reset to ${activeTemplate.name}`
                  : "Reset to defaults"}
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
            {hasSidebar && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      aria-label="Toggle controls"
                      aria-pressed={showControls}
                      onClick={toggleControls}
                    />
                  }
                >
                  <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {showControls ? "Hide controls" : "Show controls"}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    aria-label="View code"
                    onClick={() => setShowCode(true)}
                  />
                }
              >
                <HugeiconsIcon
                  icon={SourceCodeIcon}
                  strokeWidth={1.5}
                  className="size-5"
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">View code</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>
        <section
          className="flex min-h-0 flex-1 flex-col items-center gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors sm:gap-4 sm:px-6 md:pb-6 lg:px-10 lg:pb-8"
          style={{ background: css(stage) }}
        >
          <div className="flex min-h-0 w-full flex-1 items-center justify-center py-1 sm:py-4">
            {spec.control ? (
              <div className="[container-type:size] flex h-full w-full items-center justify-center">
                {spec.rangeFrom === undefined ? (
                  <GaugeControl
                    value={shown}
                    onChange={setValue}
                    {...controlProps(spec.control)}
                  >
                    {gauge}
                  </GaugeControl>
                ) : (
                  <GaugeControl
                    value={
                      [
                        Math.min(spec.rangeFrom, shown),
                        Math.max(spec.rangeFrom, shown),
                      ] as [number, number]
                    }
                    onChange={setRange}
                    {...controlProps(spec.control)}
                  >
                    {gauge}
                  </GaugeControl>
                )}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {gauge}
              </div>
            )}
          </div>
          <ControlBar
            layers={layers}
            selected={selected}
            onSelect={selectLayer}
            onAdd={addLayer}
            onRemove={removeLayer}
            value={current}
            min={min}
            max={max}
            step={stepFor(max - min)}
            mode={mode}
            onValueChange={setValue}
            onModeChange={setMode}
          />
        </section>
        <CodeDrawer code={code} open={showCode} onOpenChange={setShowCode} />
      </main>
      {hasSidebar && showControls && (
        <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden p-2 lg:w-80 xl:w-88">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-card ring ring-foreground/10">
            <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 py-1.5 pr-1.5 pl-3">
              <span className="text-xs font-medium text-muted-foreground">
                Controls
              </span>
              <CopyValuesButton values={layers[selected].values} />
            </div>
            <ScrollArea revealOnHover className="min-h-0 w-full flex-1">
              <ControlsRoot />
            </ScrollArea>
          </div>
        </aside>
      )}
    </div>
  )
}
