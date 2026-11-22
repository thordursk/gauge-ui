const TOOL_DIRECTIVE =
  /^\s*(eslint-disable|eslint-enable|eslint\s|globals?\s|exported\s|@ts-(expect-error|ignore|nocheck|check)\b|prettier-ignore\b|[#@]__PURE__|\s*webpack[A-Z]\w*:|@vite-ignore\b)/

const TRIPLE_SLASH = /^\/\s*<reference\s/

const LICENSE = /\b(license|copyright)\b/i

const API_DOC_TARGETS = new Set([
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "TSPropertySignature",
  "TSMethodSignature",
])

const isToolDirective = (comment) =>
  TOOL_DIRECTIVE.test(comment.value) ||
  (comment.type === "Line" && TRIPLE_SLASH.test(comment.value))

const isLeadingLicense = (comment, index) =>
  index === 0 && comment.type === "Block" && LICENSE.test(comment.value)

export const isApiDoc = (sourceCode, comment) => {
  if (comment.type !== "Block" || !comment.value.startsWith("*")) return false
  const next = sourceCode.getTokenAfter(comment, { includeComments: true })
  if (!next || next.type === "Block" || next.type === "Line") return false
  let node = sourceCode.getNodeByRangeIndex(next.range[0])
  while (node) {
    if (API_DOC_TARGETS.has(node.type)) return true
    if (!node.parent || node.parent.range[0] !== next.range[0]) return false
    node = node.parent
  }
  return false
}

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
    schema: [
      {
        type: "object",
        properties: { allowApiDocs: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const allowApiDocs = context.options[0]?.allowApiDocs ?? false
    const { sourceCode } = context
    return {
      Program() {
        sourceCode.getAllComments().forEach((comment, index) => {
          if (comment.type === "Shebang") return
          if (isToolDirective(comment) || isLeadingLicense(comment, index))
            return
          if (allowApiDocs && isApiDoc(sourceCode, comment)) return
          context.report({ loc: comment.loc, messageId: "comment" })
        })
      },
    }
  },
}

export default noComments
