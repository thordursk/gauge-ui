import { describe, expect, it } from "vitest"

import { gaugeToCode } from "@/lib/gauge-code"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

describe("gaugeToCode", () => {
  it.each(gaugeTemplates.map((template) => [template.id, template] as const))(
    "prints the %s template",
    (_, template) => {
      expect(gaugeToCode(templatePreview(template).spec)).toMatchSnapshot()
    }
  )
})
