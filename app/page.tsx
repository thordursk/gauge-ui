import { HeroSection } from "@/components/landing/hero-section"
import { InstallSection } from "@/components/landing/install-section"
import { ExamplesSection } from "@/components/landing/examples-section"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { Separator } from "@/components/ui/separator"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <SiteHeader />
      <main className="mb-10 flex-1">
        <HeroSection />
        <InstallSection />
        <Separator />
        <ExamplesSection />
      </main>
      <SiteFooter />
    </div>
  )
}
