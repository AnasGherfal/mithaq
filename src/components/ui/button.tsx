import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "premium-interactive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_1px_rgba(0,0,0,0.06),0_8px_22px_rgba(13,73,60,0.14)] hover:bg-primary/94 hover:shadow-[0_2px_2px_rgba(0,0,0,0.05),0_12px_28px_rgba(13,73,60,0.18)]",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/92",
        outline:
          "border border-border bg-card/80 text-foreground shadow-[0_1px_2px_rgba(20,32,27,0.04)] backdrop-blur-sm hover:border-primary/20 hover:bg-card",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-primary/6",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-11 rounded-xl px-4",
        lg: "h-[3.25rem] rounded-[0.9rem] px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
