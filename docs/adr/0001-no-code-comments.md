# No code comments

The codebase had about 1,200 comments (some 2,600 lines). Nearly two thirds only narrated the code. A quarter excused code that should have carried its own meaning, such as units in JSDoc instead of names, unnamed magic numbers and workarounds. The rest recorded real decisions, scattered where nobody would look for them. We ban comments outright, with `local/no-comments` in `eslint-rules/no-comments.mjs`, and give each kind of information a home:

- Narration: nowhere. Names and types carry it.
- Excuses for a hack: a `tech-debt` GitHub issue, so the fix is tracked instead of explained away.
- Non-obvious decisions: an ADR in this folder.

Tool directives (`eslint-disable*`, `@ts-*`, `/// <reference`, `prettier-ignore`, pure and webpack annotations) and a license notice as a file's first comment are allowed. Comments in existing code that can't be removed yet are grandfathered per file in `eslint-suppressions.json`, using ESLint's bulk suppressions. That file is a ratchet. A file going over its count fails lint, and a count left higher than the file needs also fails, until `npm run lint:prune` lowers it. The `/delete-comment` skill (`.claude/skills/delete-comment`) repeats the purge.

## Consequences

- The gauge primitives shipped through the shadcn registry no longer carry prop JSDoc. Their API docs live in the README and the studio, and the names have to stand on their own.
- ESLint reads `.gitignore` and `.git/info/exclude`, so a contributor's untracked local files never enter the suppressions file.
