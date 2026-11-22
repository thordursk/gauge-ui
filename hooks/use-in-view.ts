"use client"

import { useEffect, useState, type RefObject } from "react"

export const useInView = (target: RefObject<Element | null>) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return visible
}
