const TOOL_DIRECTIVE =
  /^\s*(eslint-disable|eslint-enable|eslint\s|globals?\s|exported\s|@ts-(expect-error|ignore|nocheck|check)\b|prettier-ignore\b|[#@]__PURE__|\s*webpack[A-Z]\w*:|@vite-ignore\b)/

const TRIPLE_SLASH = /^\/\s*<reference\s/

const LICENSE = /\b(license|copyright)\b/i

const isToolDirective = (comment) =>
  TOOL_DIRECTIVE.test(comment.value) ||
  (comment.type === "Line" && TRIPLE_SLASH.test(comment.value))

const isLeadingLicense = (comment, index) =>
  index === 0 && comment.type === "Block" && LICENSE.test(comment.value)

const noComments = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ban code comments: delete tautologies and stale notes, file an issue for excuses, record decisions as ADRs in docs/adr/",
    },
    messages: {
      comment:
        "Comments are banned. Tautology or stale: delete it. Excuse for a hack: delete it and file an issue. Non-obvious decision: move it to an ADR in docs/adr/. See .claude/skills/delete-comment.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        context.sourceCode.getAllComments().forEach((comment, index) => {
          if (comment.type === "Shebang") return
          if (isToolDirective(comment) || isLeadingLicense(comment, index))
            return
          context.report({ loc: comment.loc, messageId: "comment" })
        })
      },
    }
  },
}

export default noComments
