import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter, Nunito } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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

/* The site's own face, for text and headings alike, on every page. */
const fontGeist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

export const metadata: Metadata = {
  title: { default: "Gauge UI", template: "%s · Gauge UI" },
  description:
    "Composable SVG gauge primitives for React, distributed as a shadcn registry.",
}

/* The studio is exactly one screen tall, so it paints into the safe areas
   and the elements that reach them pad themselves back out. */
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
      </body>
    </html>
  )
}
