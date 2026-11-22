import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { includeIgnoreFile } from "@eslint/compat"
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import noComments from "./eslint-rules/no-comments.mjs"

const gitIgnoreFiles = [".gitignore", ".git/info/exclude"]
  .map((file) => fileURLToPath(new URL(file, import.meta.url)))
  .filter((file) => existsSync(file))
  .map((file) => includeIgnoreFile(file))

const eslintConfig = defineConfig([
  ...gitIgnoreFiles,
  ...nextVitals,
  ...nextTs,
  {
    settings: { react: { version: "19.2" } },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: { local: { rules: { "no-comments": noComments } } },
    rules: { "local/no-comments": "error" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "components/examples/hairline/kernel.js",
  ]),
])

export default eslintConfig
