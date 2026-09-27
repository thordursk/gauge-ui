"use client"

import { useEffect, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { withoutMeta, type PanelValues } from "@/lib/gauge-panels"

type CopyValuesButtonProps = {
  /** Every panel's values for the layer being edited. */
  values: PanelValues
}

/**
 * Copies every control section as one JSON object, keyed by panel the way a
 * template's `values` are, so a copied gauge can be pasted straight into
 * `lib/gauge-templates.ts`. Panel bookkeeping such as `_collapsed` is left out.
 */
export const CopyValuesButton = ({ values }: CopyValuesButtonProps) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(withoutMeta(values), null, 2)
      )
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={copy}
              aria-label="Copy controls as JSON"
            />
          }
        >
          <HugeiconsIcon
            icon={copied ? Tick02Icon : Copy01Icon}
            strokeWidth={2}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {copied ? "Copied" : "Copy controls as JSON"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
