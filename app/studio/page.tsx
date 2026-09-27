import type { Metadata } from "next"

import { GaugeStudio } from "@/components/gauge-studio"
import { siteName } from "@/lib/site"

const description =
  "Design a gauge visually — compose arcs, zones, ticks and needles, tune every part live, then copy the React code into your project."

export const metadata: Metadata = {
  title: "Studio",
  description,
  alternates: { canonical: "/studio" },
  openGraph: {
    type: "website",
    siteName,
    url: "/studio",
    title: "Gauge Studio",
    description,
    /* Defining `openGraph` here replaces the inherited field wholesale, which
       drops the root segment's file-convention card — so point back at it. */
    images: [
      {
        url: "/opengraph-image.png",
        width: 2400,
        height: 1260,
        alt: "Gauge UI — build any gauge you can imagine",
      },
    ],
  },
}

export default function StudioPage() {
  return <GaugeStudio />
}
