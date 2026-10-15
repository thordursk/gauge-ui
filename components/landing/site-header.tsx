"use client"

import { GithubIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { LogoLink } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { repoUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

const links = [
  { href: "#install", label: "Install" },
  { href: "#examples", label: "Examples" },
]

/* 118 → "118", 1234 → "1.2K". Pinned to en-US so server and client agree. */
const starFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const SiteHeader = ({ stars }: { stars?: number | null }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-colors",
        scrolled ? "border-foreground/5" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4 sm:px-6">
        <LogoLink className="mr-auto" />
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Button
              key={link.href}
              variant="ghost-muted"
              size="sm"
              nativeButton={false}
              render={<a href={link.href} />}
            >
              {link.label}
            </Button>
          ))}
        </nav>
        <Button
          variant="ghost-muted"
          size="sm"
          nativeButton={false}
          render={<Link href="/studio" />}
        >
          Studio
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size={stars == null ? "icon-sm" : "sm"}
                  variant="ghost-muted"
                  aria-label={
                    stars == null
                      ? "GitHub repository"
                      : `GitHub repository, ${stars.toLocaleString("en-US")} stars`
                  }
                  nativeButton={false}
                  render={
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                />
              }
            >
              <HugeiconsIcon
                icon={GithubIcon}
                strokeWidth={2}
                data-icon={stars == null ? undefined : "inline-start"}
              />
              {stars != null && (
                <span className="tabular-nums">{starFormat.format(stars)}</span>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom">GitHub</TooltipContent>
          </Tooltip>
          <ThemeToggle variant="ghost-muted" />
        </TooltipProvider>
      </div>
    </header>
  )
}
