import ts from "typescript"
import { execSync } from "node:child_process"
import fs from "node:fs"

const base = process.argv[2] || "HEAD"
const files = execSync(`git diff --name-only ${base}`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)

const scriptKind = (f) =>
  f.endsWith("x")
    ? ts.ScriptKind.TSX
    : /\.(c|m)?js$/.test(f)
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS

const leafTokens = (src, f) => {
  const sf = ts.createSourceFile(
    f,
    src,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(f)
  )
  const out = []
  const walk = (node) => {
    if (
      node.kind >= ts.SyntaxKind.FirstJSDocNode &&
      node.kind <= ts.SyntaxKind.LastJSDocNode
    )
      return
    if (ts.isJsxExpression(node) && !node.expression) return
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/\s+/g, " ").trim()
      if (text) out.push(text)
      return
    }
    const kids = node.getChildren(sf)
    if (kids.length === 0) {
      if (node.kind !== ts.SyntaxKind.EndOfFileToken) out.push(node.getText(sf))
      return
    }
    kids.forEach(walk)
  }
  walk(sf)
  return out.join("\u0000")
}

const cssTokens = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim()

let bad = 0
let checked = 0
for (const f of files) {
  if (!/\.(tsx?|jsx?|mjs|cjs|css)$/.test(f) || !fs.existsSync(f)) continue
  let before
  try {
    before = execSync(`git show ${base}:${f}`, {
      encoding: "utf8",
      maxBuffer: 1e8,
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    continue
  }
  const after = fs.readFileSync(f, "utf8")
  const norm = f.endsWith(".css") ? cssTokens : (s) => leafTokens(s, f)
  checked++
  if (norm(before) !== norm(after)) {
    bad++
    console.log("NON-COMMENT CHANGE:", f)
  }
}
console.log(
  bad
    ? `${bad} of ${checked} file(s) changed beyond comments`
    : `OK: ${checked} changed files, comments only`
)
process.exitCode = bad ? 1 : 0
