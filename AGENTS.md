<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## No code comments

Code comments fail lint (`local/no-comments`; see `docs/adr/0001-no-code-comments.md`). Put the reasoning where it belongs: a non-obvious decision goes in an ADR in `docs/adr/`, and a workaround goes in a `tech-debt` issue. Before changing code that looks odd, check `docs/adr/` for the decision behind it.
