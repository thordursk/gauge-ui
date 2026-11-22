import { ESLint } from "eslint"
import { execSync } from "node:child_process"
import fs from "node:fs"

const scope = process.argv.slice(2)
const tracked = execSync(
  `git ls-files -- ${scope.map((s) => `'${s}'`).join(" ")}`,
  {
    encoding: "utf8",
  }
)
  .split("\n")
  .filter(Boolean)

const eslint = new ESLint()
const scripts = tracked.filter((f) => /\.(c|m)?[jt]sx?$/.test(f))
const results = await eslint.lintFiles(scripts.length ? scripts : [])

const rows = []
for (const result of results) {
  const file = result.filePath.replace(`${process.cwd()}/`, "")
  const lines = fs.readFileSync(result.filePath, "utf8").split("\n")
  for (const m of result.messages) {
    if (m.ruleId !== "local/no-comments") continue
    rows.push(`${file}:${m.line}  ${lines[m.line - 1].trim().slice(0, 100)}`)
  }
}

for (const file of tracked.filter((f) => f.endsWith(".css"))) {
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("/*"))
        rows.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`)
    })
}

console.log(rows.join("\n"))
console.log(`\n${rows.length} comment(s)`)
