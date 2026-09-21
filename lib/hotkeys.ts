/** True when a key event came from a field the user is typing or editing in. */
export const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

/** True for plain key presses: no modifier held and not a held-down repeat. */
export const isPlainKey = (event: KeyboardEvent) =>
  !event.defaultPrevented &&
  !event.repeat &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey
