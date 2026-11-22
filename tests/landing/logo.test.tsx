import { markup } from "@/tests/markup"
import { describe, expect, it } from "vitest"

import { Logo, LogoLink } from "@/components/logo"

describe("Logo", () => {
  it("renders the mark", () => {
    expect(markup(<Logo className="size-7" />)).toMatchSnapshot()
  })

  it("renders the link with its animated mark", () => {
    expect(markup(<LogoLink />)).toMatchSnapshot()
  })
})
