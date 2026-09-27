import type { Metadata } from "next"

import { GaugeStudio } from "@/components/gauge-studio"

export const metadata: Metadata = {
  title: "Studio",
  description: "Compose and tune a custom gauge, then copy the code.",
}

export default function StudioPage() {
  return <GaugeStudio />
}
