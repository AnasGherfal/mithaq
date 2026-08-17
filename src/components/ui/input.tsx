import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[0.9rem] border border-input bg-card/75 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_1px_2px_rgba(20,32,27,0.035)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/75 focus-visible:border-primary/55 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
