"use client"

import { useId, useState } from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const SetupPrompt = ({ prompt }: { prompt: string }) => {
  const [expanded, setExpanded] = useState(false)
  const id = useId()

  return (
    <Card size="sm" className="relative shadow-none">
      <CopyButton
        value={prompt}
        label="Copy prompt"
        className="absolute top-2 right-2"
      />
      <CardContent className="flex flex-col items-start gap-2 pr-12">
        <CardDescription
          id={id}
          className={cn("leading-relaxed", !expanded && "line-clamp-2")}
        >
          {prompt}
        </CardDescription>
        <Button
          variant="ghost-muted"
          size="xs"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="-ml-2.5 aria-expanded:bg-transparent aria-expanded:text-muted-foreground aria-expanded:hover:bg-accent aria-expanded:hover:text-foreground"
        >
          {expanded ? "Show less" : "Show full prompt"}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            data-icon="inline-end"
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </Button>
      </CardContent>
    </Card>
  )
}
