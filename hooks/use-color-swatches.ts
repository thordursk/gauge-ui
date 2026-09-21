"use client"

import { useEffect } from "react"

import { palette } from "@/lib/gauge-panels"

/**
 * dialkit's select renders its options as plain text and takes no renderer,
 * so the colour dropdowns are decorated from the outside: this hook finds
 * them in the panel and hands each row the colour it names, and the
 * `[data-color-swatch]` rules in `globals.css` draw the dot.
 *
 * The colour is passed as a custom property rather than as a child element
 * on purpose. React owns those nodes, and it rewrites a text-only child by
 * setting `textContent` on its parent, which would throw away any element we
 * put beside the label; a property and a pseudo-element survive that.
 */

/** dialkit title-cases bare string options, so "custom" reads "Custom". */
const CUSTOM = "Custom"

/**
 * The label dialkit gives the colour select, from the `token` key the panels
 * build the folder with. It is what tells a colour dropdown apart from the
 * other selects, so the two names have to move together.
 */
const TOKEN = "Token"

const MARK = "data-color-swatch"
const PROPERTY = "--color-swatch"

/** A hint of every colour, for the entry that stands for "any colour". */
const CUSTOM_SWATCH =
  "conic-gradient(from 0.5turn, #f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171)"

const swatches = new Map<string, string>([
  ...palette.map(({ label, css }) => [label, css] as const),
  [CUSTOM, CUSTOM_SWATCH],
])

const paint = (el: Element, label: string | null) => {
  const swatch = label === null ? undefined : swatches.get(label)
  if (swatch) {
    el.setAttribute(MARK, "")
    ;(el as HTMLElement).style.setProperty(PROPERTY, swatch)
    return
  }
  if (!el.hasAttribute(MARK)) return
  el.removeAttribute(MARK)
  ;(el as HTMLElement).style.removeProperty(PROPERTY)
}

const text = (el: Element | null) => el?.textContent?.trim() ?? null

/** Whether a select trigger belongs to one of the colour folders. */
const isColorSelect = (trigger: Element) =>
  text(trigger.querySelector(".dialkit-select-label")) === TOKEN

const sync = () => {
  for (const trigger of document.querySelectorAll(".dialkit-select-trigger")) {
    const value = trigger.querySelector(".dialkit-select-value")
    if (value) paint(value, isColorSelect(trigger) ? text(value) : null)
  }
  /* The open dropdown is portalled away from its trigger, so there is no way
     up from its options to the control they belong to — but only one is ever
     open, which is link enough. A dropdown on its way out has no open trigger
     left to read, and is left alone rather than stripped mid-animation. */
  const open = document.querySelector(
    '.dialkit-select-trigger[data-open="true"]'
  )
  if (!open) return
  const color = isColorSelect(open)
  for (const option of document.querySelectorAll(".dialkit-select-option")) {
    paint(option, color ? text(option) : null)
  }
}

/**
 * Keeps the colour swatches in the dialkit panel in step with it: options
 * arrive when a dropdown opens, and a trigger's value changes under it as
 * colours are picked, so both are watched.
 */
export const useColorSwatches = () => {
  useEffect(() => {
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        sync()
      })
    }
    /* Attributes are left unwatched so the properties written below cannot
       feed back into the observer. */
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    sync()
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
