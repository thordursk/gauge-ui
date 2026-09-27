"use client"

import { useState } from "react"

import { CopyButton } from "@/components/copy-button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Prompt = { title: string; prompt: string }

/** One prompt at a time, chosen from a dropdown, with a floating copy button. */
export const PromptPicker = ({ prompts }: { prompts: Prompt[] }) => {
  const [title, setTitle] = useState(prompts[0].title)
  const current = prompts.find((item) => item.title === title) ?? prompts[0]
  const items = prompts.map((item) => ({
    label: item.title,
    value: item.title,
  }))

  return (
    <div className="flex flex-col gap-2">
      <Select
        items={items}
        value={title}
        onValueChange={(value) => value && setTitle(value)}
      >
        <SelectTrigger
          size="sm"
          aria-label="Choose a prompt"
          className="h-7! bg-transparent px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-auto min-w-(--anchor-width) p-1">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Card size="sm" className="relative shadow-none">
        <CopyButton
          value={current.prompt}
          label="Copy prompt"
          className="absolute top-2 right-2"
        />
        <CardContent className="pr-12">
          <CardDescription className="leading-relaxed">
            {current.prompt}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
