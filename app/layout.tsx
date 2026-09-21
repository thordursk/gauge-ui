import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter, Nunito } from "next/font/google"

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

export const metadata: Metadata = {
  title: "Gauge Studio",
  description: "Compose and tune a custom gauge, then copy the code.",
}

/* The studio is exactly one screen tall, so it paints into the safe areas
   and the elements that reach them pad themselves back out. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(1 0 0)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.205 0 0)" },
  ],
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
        "font-sans",
        inter.variable,
        fontMono.variable,
        fontRounded.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
