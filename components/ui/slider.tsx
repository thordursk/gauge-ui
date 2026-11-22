import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

type SliderProps = SliderPrimitive.Root.Props & {
  variant?: "default" | "dial"
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  variant = "default",
  children,
  ...props
}: SliderProps) {
  if (variant === "dial") {
    return (
      <SliderPrimitive.Root
        className={cn("relative h-8 w-full rounded-md", className)}
        data-slot="slider"
        data-variant="dial"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        thumbAlignment="edge"
        {...props}
      >
        <SliderPrimitive.Control className="group relative flex h-full w-full cursor-ew-resize touch-none items-center overflow-hidden rounded-[inherit] bg-input/50 select-none data-disabled:opacity-50">
          <SliderPrimitive.Track
            data-slot="slider-track"
            className="h-full w-full select-none"
          >
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="relative h-full overflow-hidden bg-foreground/15 select-none"
            >
              <span
                aria-hidden
                className="absolute top-1/2 right-1 h-5 w-1 -translate-y-1/2 rounded-full bg-foreground/70 opacity-0 transition-opacity select-none group-hover:opacity-100 group-data-dragging:opacity-100 group-has-focus-visible:opacity-100"
              />
            </SliderPrimitive.Indicator>
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="block size-0 outline-hidden select-none"
          />
        </SliderPrimitive.Control>
        {children}
      </SliderPrimitive.Root>
    )
  }

  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-horizontal:py-2 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-vertical:px-2">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-input/90 select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary/90 select-none dark:bg-primary/70 data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="block h-4 w-6 shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] select-none not-dark:bg-clip-padding hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-vertical:h-6 data-vertical:w-4"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
