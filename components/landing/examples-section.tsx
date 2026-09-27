import { examples } from "@/components/examples"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const ExamplesSection = () => (
  <section
    id="examples"
    className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28"
  >
    <div className="flex max-w-xl flex-col gap-3">
      <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
        Examples
      </h2>
    </div>
    <Tabs defaultValue={examples[0].id} className="gap-4">
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
