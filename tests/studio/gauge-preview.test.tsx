import { markup } from "@/tests/markup"
import { describe, expect, it } from "vitest"

import { GaugePreview } from "@/components/gauge-preview"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

describe("GaugePreview", () => {
  it.each(gaugeTemplates.map((template) => [template.id, template] as const))(
    "renders the %s template",
    (_, template) => {
      const { spec, value } = templatePreview(template)
      expect(
        markup(<GaugePreview spec={spec} value={value} />)
      ).toMatchSnapshot()
    }
  )
})
