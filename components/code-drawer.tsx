"use client"

import { useEffect, useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { highlightTsx } from "@/lib/highlight"

type CodeDrawerProps = {
  code: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A side drawer with the generated component source, highlighted, and a copy button. */
export const CodeDrawer = ({ code, open, onOpenChange }: CodeDrawerProps) => {
  const [copied, setCopied] = useState(false)
  const html = useHighlighted(open ? code : null)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-hidden p-0 pb-[env(safe-area-inset-bottom)] data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-xl data-[side=right]:sm:rounded-2xl data-[side=right]:sm:border data-[side=right]:lg:max-w-2xl"
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
          <SheetTitle className="font-mono text-sm">
            custom-gauge.tsx
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Copy01Icon}
                data-icon="inline-start"
              />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {html ? (
            <div
              className="code-block px-4 py-4 font-mono text-xs leading-relaxed sm:px-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre className="code-block overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed text-foreground/90 sm:px-5">
              <code>
                {code.split("\n").map((line, index) => (
                  <span key={index} className="line">
                    {line}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Highlights `code` off the render path. Returns the previous markup while a
 * new version is being produced so the drawer never flashes to plain text,
 * and null until the first highlight lands or while `code` is null.
 */
const useHighlighted = (code: string | null) => {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (code === null) return
    let cancelled = false
    highlightTsx(code).then(
      (result) => {
        if (!cancelled) setHtml(result)
      },
      () => {
        if (!cancelled) setHtml(null)
      }
    )
    return () => {
      cancelled = true
    }
  }, [code])

  return html
}
