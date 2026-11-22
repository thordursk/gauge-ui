import { afterEach, beforeEach, vi } from "vitest"

type Matrix = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

const matrix = ({ a, b, c, d, e, f }: Matrix) => ({
  a,
  b,
  c,
  d,
  e,
  f,
  inverse() {
    const det = a * d - b * c
    return matrix({
      a: d / det,
      b: -b / det,
      c: -c / det,
      d: a / det,
      e: (c * f - d * e) / det,
      f: (b * e - a * f) / det,
    })
  },
})

class Point {
  constructor(
    public x = 0,
    public y = 0
  ) {}
  matrixTransform(m: Matrix) {
    return new Point(
      m.a * this.x + m.c * this.y + m.e,
      m.b * this.x + m.d * this.y + m.f
    )
  }
}

export type Layout = {
  box: { left: number; top: number; width: number; height: number }
  ctm: Matrix
}

export const square = (size: number, left = 0, top = 0): Layout => ({
  box: { left, top, width: size, height: size },
  ctm: { a: 1, b: 0, c: 0, d: 1, e: left + size / 2, f: top + size / 2 },
})

export const fakeLayout = (layout: () => Layout) => {
  const captured = new Set<number>()
  const releaseAll = () => captured.clear()

  beforeEach(() => {
    captured.clear()
    document.addEventListener("pointerup", releaseAll)
    vi.stubGlobal("DOMPoint", Point)
    const proto = Element.prototype as unknown as Record<string, unknown>
    proto.setPointerCapture = (id: number) => captured.add(id)
    proto.releasePointerCapture = (id: number) => captured.delete(id)
    proto.hasPointerCapture = (id: number) => captured.has(id)
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      () => {
        const { left, top, width, height } = layout().box
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
          toJSON: () => ({}),
        }
      }
    )
    ;(SVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM =
      () => matrix(layout().ctm)
  })

  afterEach(() => {
    document.removeEventListener("pointerup", releaseAll)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    const proto = Element.prototype as unknown as Record<string, unknown>
    delete proto.setPointerCapture
    delete proto.releasePointerCapture
    delete proto.hasPointerCapture
    delete (SVGElement.prototype as unknown as Record<string, unknown>)
      .getScreenCTM
  })

  return captured
}
