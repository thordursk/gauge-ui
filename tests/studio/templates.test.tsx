import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GaugePreview } from "@/components/gauge-preview"
import { gaugeToCode } from "@/lib/gauge-code"
import { gaugeTemplates, templatePreview } from "@/lib/gauge-templates"

describe("gauge templates", () => {
  it("keep their shelves and order", () => {
    expect(gaugeTemplates.map((t) => `${t.category}/${t.id}`)).toMatchSnapshot()
  })

  describe.each(gaugeTemplates.map((t) => [t.id, t] as const))(
    "%s",
    (_, template) => {
      const { spec, value } = templatePreview(template)

      it("generates the same code", () => {
        expect(gaugeToCode(spec)).toMatchSnapshot()
      })

      it("renders the same preview", () => {
        expect(
          renderToStaticMarkup(<GaugePreview spec={spec} value={value} />)
        ).toMatchSnapshot()
      })

      it("renders the same played-in preview", () => {
        expect(
          renderToStaticMarkup(
            <GaugePreview spec={spec} value={value} sweepIn />
          )
        ).toMatchSnapshot()
      })
    }
  )
})
