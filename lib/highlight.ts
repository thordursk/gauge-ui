import { createHighlighterCore, type HighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"
import tsx from "shiki/dist/langs/tsx.mjs"
import githubDark from "shiki/dist/themes/github-dark-default.mjs"
import githubLight from "shiki/dist/themes/github-light-default.mjs"

let highlighter: Promise<HighlighterCore> | undefined

const getHighlighter = () =>
  (highlighter ??= createHighlighterCore({
    langs: [tsx],
    themes: [githubLight, githubDark],
    engine: createJavaScriptRegexEngine(),
  }))

export const highlightTsx = async (code: string) => {
  const shiki = await getHighlighter()
  return shiki.codeToHtml(code, {
    lang: "tsx",
    themes: { light: "github-light-default", dark: "github-dark-default" },
    defaultColor: false,
  })
}
