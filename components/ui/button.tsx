import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* Depth stays monochrome: a faint top-lit gradient, a hairline highlight
           along the top edge, a darker bottom edge and a short drop shadow.
           Pressing swaps the lift for an inset. Dark mode flips the button to a
           light face, so it needs a brighter gradient to read and a heavier,
           tighter shadow to lift off the page. */
        default:
          "border-primary bg-primary bg-linear-to-b from-white/15 to-transparent text-primary-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.2),inset_0_-1px_0_0_rgb(0_0_0/0.2),0_1px_2px_0_rgb(0_0_0/0.3)] hover:bg-primary/90 active:not-aria-[haspopup]:shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.25)] dark:border-white/60 dark:from-white/70 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.9),inset_0_-1px_0_0_rgb(0_0_0/0.12),0_1px_2px_0_rgb(0_0_0/0.6),0_2px_6px_-1px_rgb(0_0_0/0.5)] dark:hover:bg-primary/85 dark:active:not-aria-[haspopup]:shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.3)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30",
        secondary:
          "border border-foreground/10 bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-accent hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-accent",
        "ghost-muted":
          "text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-accent",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8.5",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
