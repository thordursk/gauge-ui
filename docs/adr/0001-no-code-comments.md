# No code comments

The codebase had about 1,200 comments (some 2,600 lines). Nearly two thirds only narrated the code. A quarter excused code that should have carried its own meaning, such as units in JSDoc instead of names, unnamed magic numbers and workarounds. The rest recorded real decisions, scattered where nobody would look for them. We ban comments outright, with `local/no-comments` in `eslint-rules/no-comments.mjs`, and give each kind of information a home:

- Narration: nowhere. Names and types carry it.
- Excuses for a hack: a `tech-debt` GitHub issue, so the fix is tracked instead of explained away.
- Non-obvious decisions: an ADR in this folder.

Tool directives (`eslint-disable*`, `@ts-*`, `/// <reference`, `prettier-ignore`, pure and webpack annotations) and a license notice as a file's first comment are allowed.

**Exception: API docs on the gauge primitives.** `components/gauge/` is a component library that people install from the registry. Its prop docs are what users see in their editor, and they're where units, sign conventions and defaults belong. Spelling those out in prop names (`lengthFraction`, `offsetSvgUnits`) would make the API worse. So under `components/gauge/**`, a `/** */` comment directly on an exported declaration or on a member of a type is allowed (`allowApiDocs`). Inline comments in that folder are still banned.

Comments in existing code that can't be removed yet are grandfathered per file in `eslint-suppressions.json`, using ESLint's bulk suppressions. That file is a ratchet. A file going over its count fails lint, and a count left higher than the file needs also fails, until `npm run lint:prune` lowers it. The `/delete-comment` skill (`.claude/skills/delete-comment`) repeats the purge.

## Consequences

- ESLint reads `.gitignore` and `.git/info/exclude`, so a contributor's untracked local files never enter the suppressions file.
