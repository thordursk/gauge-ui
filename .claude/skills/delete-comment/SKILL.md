---
name: delete-comment
description: Purge code comments from gauge-ui. Classify each one, delete it, file issues for excuses, move decisions into ADRs, and tighten the lint ratchet.
disable-model-invocation: true
---

# Delete comments

gauge-ui bans code comments (`local/no-comments` in `eslint-rules/no-comments.mjs`). Comments that existed when the ban landed are grandfathered per file in `eslint-suppressions.json`, and that count can only go down. This skill pays it down. A run is done when every comment in scope is gone, every excuse has an issue, every decision has an ADR, and the suppressions file has been pruned to match.

Scope is whatever the user names (a file, a folder, "everything"). With no scope, take the files with the highest counts in `eslint-suppressions.json`.

## Steps

1. **Inventory.** List every comment in scope:
   - JS/TS: `npx eslint --suppressions-location .no-suppressions.json --rule '{"local/no-comments":"error"}' -f unix <scope> | grep no-comments`. `.no-suppressions.json` doesn't exist, which turns off the grandfathering. That location is gitignored.
   - CSS: `grep -n '/\*' <css files in scope>`.
   - Done when you hold a list of `file:line` entries and know how many there are.

2. **Classify.** Read each file in full, then put every comment into exactly one category from [Categories](#categories). Keep a ledger: file, line, category, and the issue theme or ADR topic where one applies. Done when every inventory entry has a category.

3. **Act.**
   - Delete every comment in scope, whatever its category. Remove a JSX comment along with its `{}`. Change nothing else.
   - **Excuse:** group excuses by theme and file one issue per theme. Use `gh issue create --label tech-debt`. The body lists each `file:line`, quotes the deleted comment, and names the concrete fix. First check `gh issue list --label tech-debt` and comment on an open issue for the same theme instead of opening a duplicate.
   - **Decision:** record it in `docs/adr/`, in the format of the ADRs already there: the next number, a short title, then a paragraph on the context, the decision and why. Add to an existing ADR when the decision belongs to one. Name the files or symbols involved so a reader can find the code.
   - Done when the ledger has no excuse without an issue number and no decision without an ADR path.

4. **Ratchet.**
   - `npm run lint:prune` lowers the grandfathered counts to what's left.
   - `npm run lint` must pass. A leftover suppression exits 2; a comment over its file's count exits 1.
   - Done when both commands pass.

5. **Verify.**
   - `node .claude/skills/delete-comment/verify-comments-only.mjs [base-ref]` prints `OK` only when every changed file's comment-free AST matches the base ref (default `HEAD`).
   - `npm run typecheck` passes.
   - Done when both pass. Report the counts per category, the issues filed and the ADRs written.

## Categories

- **Tautology:** repeats what the code, names or types already say. Section banners and JSDoc that paraphrases a name count. Action: delete.
- **Stale:** describes code, files or behaviour that no longer exist or no longer match. Confirm with grep. Action: delete.
- **Excuse:** props up code that ought to speak for itself or be fixed. Examples: a workaround, an unnamed magic number, units or a sign convention the name or type doesn't carry, an ordering the code doesn't enforce, a misleading name explained away. Action: delete, then file an issue for the fix.
- **Decision:** records a correct, non-obvious choice whose reason lives outside the code, such as a framework quirk, hydration, accessibility, SEO or a UX trade-off. Without it, a competent maintainer would likely "fix" the code. Action: delete, then record it in an ADR.

To break a tie, ask whether a competent maintainer would likely make a wrong change if the comment vanished. If not, it's a tautology. If so, and the code could be reshaped to make the comment unnecessary, it's an excuse. If so, and the code is right as it stands, it's a decision.

## What the rule allows

Tool directives (`eslint-disable*`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck`, `/// <reference`, `prettier-ignore`, `#__PURE__`, webpack magic comments) and a license notice as a file's first comment are allowed, so leave them in place. `components/examples/hairline/kernel.js` is vendored and out of scope. See `docs/adr/` for why.
