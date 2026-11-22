import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"

export const stableIds = (html: string) => {
  const ids = new Map<string, string>()
  return html.replace(/_R_[0-9a-z]+_|_id\d+_/g, (id) => {
    if (!ids.has(id)) ids.set(id, `_id${ids.size}_`)
    return ids.get(id)!
  })
}

export const markup = (node: ReactNode) =>
  stableIds(renderToStaticMarkup(node).replaceAll("><", ">\n<"))
