import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";
import { useRipple } from "./ripple";
import { cn } from "./utils";

const buttonVariants = cva(
  "ripple-container relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 uppercase tracking-wide overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground elevation-2 hover:elevation-4 active:elevation-8",
        destructive:
          "bg-destructive text-destructive-foreground elevation-2 hover:elevation-4 active:elevation-8",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground elevation-1 hover:elevation-2 active:elevation-3",
        ghost:
          "hover:bg-accent/50 active:bg-accent",
        link: "text-primary underline-offset-4 hover:underline normal-case",
      },
      size: {
        default: "h-10 px-6 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded px-4 gap-1.5 has-[>svg]:px-3",
        lg: "h-12 rounded px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    onClick,
    ...props
  }: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
) {
  const Comp = asChild ? Slot : "button";
  const createRipple = useRipple();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (variant !== "link") {
      createRipple(event as any);
    }
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick as any}
      {...props}
    />
  );
}

export { Button, buttonVariants };
