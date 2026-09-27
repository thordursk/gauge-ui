import { GithubIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export const SiteFooter = () => (
  <footer className="pb-[env(safe-area-inset-bottom)]">
    <Separator />
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
      <div className="flex items-center gap-4">
        <span className="font-medium tracking-tight text-foreground">
          Gauge UI
        </span>
        <Link href="/studio" className="hover:text-foreground">
          Studio
        </Link>
        <a
          href="https://github.com/thordursk/gauge-ui"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="hover:text-foreground"
        >
          <HugeiconsIcon icon={GithubIcon} size={16} strokeWidth={2} />
        </a>
      </div>
      <p className="flex items-center gap-2">
        Built by
        {/* The period sits outside the link but tight against it. */}
        <span className="flex items-center">
          <a
            href="https://x.com/doddiskula"
            target="_blank"
            rel="noopener noreferrer"
            className="group/author flex items-center gap-1.5 font-medium text-foreground"
          >
            <Avatar size="sm" className="data-[size=sm]:size-5">
              <AvatarImage src="/doddi.png" alt="" />
              <AvatarFallback>D</AvatarFallback>
            </Avatar>
            <span className="underline-offset-4 group-hover/author:underline">
              Doddi
            </span>
          </a>
          .
        </span>
      </p>
    </div>
  </footer>
)
