import { markup } from "@/tests/markup"
import { describe, expect, it } from "vitest"

import { HeroBackdrop } from "@/components/landing/hero-backdrop"

describe("HeroBackdrop", () => {
  it("renders the marquee rows of template previews", () => {
    expect(markup(<HeroBackdrop />)).toMatchSnapshot()
  })
})
