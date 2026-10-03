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
import { storageKeys, writeStored } from "@/lib/storage"

/** Matches Tailwind's `md` breakpoint, the narrowest screen the panels fit. */
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
    setMode,
    activeTemplate,
    selectTemplate,
    reset,
  } = useGaugeControllers()

  const code = useMemo(() => gaugeToCode(spec), [spec])
  const [showCode, setShowCode] = useState(false)
  const hasSidebar = useMediaQuery(SIDEBAR_QUERY)
  /* Whether the controls were left open last visit; open is where everyone
     starts, and the first render is given that either way. */
  const showControls =
    useStoredValue(storageKeys.controls, "shown") !== "hidden"

  const toggleControls = () =>
    writeStored(storageKeys.controls, showControls ? "hidden" : "shown")

  const current = clamp(val.value, min, max)
  const mode = val.mode as PlayMode
  /* The slider drives whichever gauge is selected, so the gauge itself takes
     the slider only while it is the one being edited. */
  const shown = selected === 0 ? current : hostValue

  /* Keyed on the composition, so loading a template or resetting remounts
     the gauges and sweeps them in. */
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
          {/* One provider for the header, so the icon buttons share a single
              hover delay and hand off to each other without re-arming it. */}
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
            {/* No aspect ratio here: a square gauge fills the stage and centres
                itself, a fitted one takes its height from its own ratio. */}
            {spec.control ? (
              /* A gauge set by hand is measured round the middle of its box,
                 so the control is the largest square the stage holds. It
                 sets the host's value, so it waits while an inset is in the
                 panels and the value slider is busy with that instead. */
              <div className="flex h-full w-full items-center justify-center [container-type:size]">
                <GaugeControl
                  value={shown}
                  onChange={setValue}
                  min={spec.domain.min}
                  max={spec.domain.max}
                  step={spec.control.step}
                  startAngle={spec.domain.startAngle}
                  endAngle={spec.domain.endAngle}
                  label={spec.title.show ? spec.title.text : "Value"}
                  knob={spec.control.knob}
                  disabled={selected !== 0}
                  className="size-[min(100cqw,100cqh)]"
                >
                  {gauge}
                </GaugeControl>
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
      {/* The controls only ever appear as a sidebar. Building a composition
          insert by insert is not something anyone does on a phone, so below
          the breakpoint they are left out and the bar under the gauge is the
          whole of it. Above it, the header toggle hides them to give the
          stage the full width. */}
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
