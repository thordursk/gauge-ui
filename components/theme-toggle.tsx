"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { VariantProps } from "class-variance-authority"
import { useTheme } from "next-themes"

import { Button, type buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ThemeToggleProps = {
  variant?: VariantProps<typeof buttonVariants>["variant"]
}

function ThemeToggle({ variant = "secondary" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant={variant}
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
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
      <TooltipContent side="bottom">Toggle theme</TooltipContent>
    </Tooltip>
  )
}

export { ThemeToggle }
