---
name: delete-comment
description: Purge code comments from gauge-ui. Classify each one, delete it, file issues for excuses, move decisions into ADRs, and tighten the lint ratchet.
disable-model-invocation: true
---

# Delete comments

gauge-ui bans code comments (`local/no-comments` in `eslint-rules/no-comments.mjs`, see `docs/adr/0001-no-code-comments.md`). Comments that can't be removed yet are grandfathered per file in `eslint-suppressions.json`, and that count can only go down. This skill pays it down, and also handles comments that arrive with merged code. A run is done when every comment in scope is gone, every excuse is on an issue, every decision is in an ADR, and lint passes with the suppressions pruned.

Scope is whatever the user names: a file, a folder, or everything. With no scope, take everything.

## Steps

1. **Inventory.** Run `node .claude/skills/delete-comment/list-comments.mjs [paths…]`. It lists every comment in tracked files, grandfathered ones included, as `file:line  text`, plus CSS comments and a total. It uses the lint rule's own definition of a comment, so directives and the vendored kernel are already left out. Done when you hold the list and its count.

2. **Classify.** Read each file in full, then put every listed comment into exactly one category from [Categories](#categories). Keep a ledger with file, line, category, and the issue theme or ADR topic. Note the commit you're on (`git rev-parse HEAD`) before deleting anything, because your issue links point at it. Done when every inventory entry has a category.

3. **Act.**
   - Delete every comment in scope, whatever its category. Remove a JSX comment along with its `{}`. Change nothing else, not even formatting in files Prettier already disagrees with.
   - **Excuse:** group excuses by theme and area, and file one issue per group with `gh issue create --label tech-debt`. The body gives the fix direction, then a task list with one item per site: a permalink to the deleted comment at the commit from step 2, the concrete fix, and the comment quoted. Run `gh issue list --label tech-debt` first, and add sites to an open issue for the same theme instead of opening a duplicate.
   - **Decision:** record it in `docs/adr/` in the format of the ADRs already there. Add a bullet to the existing ADR whose theme it belongs to, or start the next number with a short title and a paragraph covering the context, the decision and its cost. Name the files and symbols so a reader can find the code.
   - Done when no excuse in the ledger lacks an issue and no decision lacks an ADR.

4. **Ratchet.** `npm run lint:prune` lowers the grandfathered counts to what's left. Then `npm run lint` must pass: a leftover suppression exits 2, and a comment over its file's count exits 1. To grandfather comments you're deliberately leaving, such as code merged in mid-purge, use `npx eslint --suppress-rule local/no-comments <paths>`. Done when lint passes.

5. **Verify.** All three must pass:
   - `node .claude/skills/delete-comment/verify-comments-only.mjs <base-ref>` prints `OK` when every changed file's AST tokens match the base ref. The base ref defaults to `HEAD`. Files you changed on purpose, such as config, will be flagged; check that nothing else is.
   - `npm run typecheck`.
   - `npm run build`.

   Done when they pass. Report the counts per category, the issues filed and the ADRs written.

## Categories

- **Tautology:** repeats what the code, names or types already say. Section banners and JSDoc that paraphrases a name count. Action: delete.
- **Stale:** describes code, files or behaviour that no longer exist or no longer match. Confirm with grep. Action: delete.
- **Excuse:** props up code that ought to speak for itself or be fixed. Examples: a workaround, an unnamed magic number, a unit or sign convention the name or type doesn't carry, an ordering the code doesn't enforce, a misleading name explained away. Action: delete, then put it on an issue.
- **Decision:** records a correct, non-obvious choice whose reason lives outside the code, such as a framework quirk, hydration, accessibility, SEO or a UX trade-off. Without it, a competent maintainer would likely "fix" the code. Action: delete, then record it in an ADR.

To break a tie, ask whether a competent maintainer would likely make a wrong change if the comment vanished. If not, it's a tautology. If so, and the code could be reshaped to make the comment unnecessary, it's an excuse. If so, and the code is right as it stands, it's a decision. Most well-written prose comments still only narrate the code, which makes them tautologies.

## Scope boundaries

- Only touch git-tracked files. Contributors keep untracked local files listed in `.git/info/exclude`, and git can't restore those. ESLint and both scripts already skip them.
- `components/examples/hairline/kernel.js` is vendored byte-for-byte; see ADR 0013.
- Tool directives (`eslint-disable*`, `@ts-*`, `/// <reference`, `prettier-ignore`, `#__PURE__`, webpack magic comments) and a license notice as a file's first comment are allowed. Leave them.
- In `components/gauge/`, JSDoc directly on an export or on a type member is API documentation, and the rule allows it (`allowApiDocs`). Leave it, and don't file issues asking to move units or conventions into longer prop names: ADR 0001 explains why.
- For a run large enough to split across subagents, give each one a disjoint set of files, this file as its rubric, and its own ledger file. Run the verify step yourself at the end.
