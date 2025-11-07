import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all overflow-hidden elevation-1 normal-case",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a&]:hover:elevation-2",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:elevation-2",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:elevation-2",
        outline:
          "border-2 border-primary bg-transparent text-primary [a&]:hover:bg-primary/10",
        success:
          "text-white [a&]:hover:elevation-2",
        warning:
          "text-white [a&]:hover:elevation-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  const customStyle = variant === "success" 
    ? { backgroundColor: 'var(--md-success-500)', ...style }
    : variant === "warning"
    ? { backgroundColor: 'var(--md-warning-500)', ...style }
    : style;

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      style={customStyle}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
