import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Agentation } from "agentation"
import { Geist, Geist_Mono, Inter, Nunito } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { siteDescription, siteName, siteUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const fontRounded = Nunito({
  subsets: ["latin"],
  variable: "--font-rounded",
})

const fontGeist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gauge UI — composable gauge components for React",
    template: "%s · Gauge UI",
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: "Thordur", url: "https://github.com/thordursk" }],
  creator: "Thordur",
  keywords: [
    "react gauge component",
    "svg gauge",
    "speedometer component",
    "radial gauge",
    "dial component",
    "shadcn registry",
    "shadcn/ui",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    url: "/",
    title: "Gauge UI — composable gauge components for React",
    description: siteDescription,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "oklch(0.205 0 0)",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-geist",
        inter.variable,
        fontMono.variable,
        fontRounded.variable,
        fontGeist.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  )
}
