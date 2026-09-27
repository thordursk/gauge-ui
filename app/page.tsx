import { HeroSection } from "@/components/landing/hero-section"
import { InstallSection } from "@/components/landing/install-section"
import { ExamplesSection } from "@/components/landing/examples-section"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { Separator } from "@/components/ui/separator"
import { siteDescription, siteName, siteUrl } from "@/lib/site"

/* Tells search engines what the site is: free developer tooling, one author,
   MIT licensed. Rendered as JSON-LD on the landing page only. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: "https://opensource.org/license/mit",
  author: {
    "@type": "Person",
    name: "Thordur",
    url: "https://github.com/thordursk",
  },
}

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
