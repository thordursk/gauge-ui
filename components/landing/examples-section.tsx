"use client"

import { useEffect, useRef, useState } from "react"

import { examples } from "@/components/examples"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const ExamplesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [tab, setTab] = useState(examples[0].id)

  /* A hash naming an example (#music-studio) opens its tab and scrolls here.
     The hash is then swapped for #examples, so following the same link again
     fires another hashchange. */
  useEffect(() => {
    const openFromHash = (smooth: boolean) => {
      const id = window.location.hash.slice(1)
      if (!examples.some((example) => example.id === id)) return
      setTab(id)
      history.replaceState(null, "", "#examples")
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      sectionRef.current?.scrollIntoView({
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
      })
    }
    const onHashChange = () => openFromHash(true)

    openFromHash(false)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return (
    <section
      ref={sectionRef}
      id="examples"
      className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="flex max-w-xl flex-col gap-3">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Examples
        </h2>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="gap-4"
      >
        <TabsList className="max-w-full justify-start overflow-x-auto">
          {examples.map((example) => (
            <TabsTrigger key={example.id} value={example.id}>
              {example.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {examples.map(({ id, Component }) => (
          <TabsContent key={id} value={id} className="flex flex-col gap-3">
            <div>{Component ? <Component /> : null}</div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
