"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          />
        }
      >
        {/* Both icons render so the server and client markup match; CSS picks one. */}
        <HugeiconsIcon
          icon={Sun03Icon}
          className="dark:hidden"
          strokeWidth={2}
        />
        <HugeiconsIcon
          icon={Moon02Icon}
          className="hidden dark:block"
          strokeWidth={2}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">Toggle theme (D)</TooltipContent>
    </Tooltip>
  )
}

export { ThemeToggle }
