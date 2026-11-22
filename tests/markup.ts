import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"

export const markup = (node: ReactNode) =>
  renderToStaticMarkup(node).replaceAll("><", ">\n<")
