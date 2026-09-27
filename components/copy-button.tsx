"use client"

import { useEffect, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"

type CopyButtonProps = {
  /** The text put on the clipboard. */
  value: string
  /** What is being copied, for the accessible name. */
  label?: string
  className?: string
}

/** An icon button that copies a string and ticks for a moment once it has. */
export const CopyButton = ({
  value,
  label = "Copy",
  className,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      size="icon-sm"
      variant="ghost-muted"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={className}
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
    </Button>
  )
}
