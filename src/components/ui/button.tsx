import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-[-0.01em] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-blue/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Premium matte-white flagship CTA
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/60%),0_1px_3px_oklch(0_0_0/30%)] hover:bg-white hover:-translate-y-px hover:shadow-[inset_0_1px_0_oklch(1_0_0/80%),0_6px_20px_oklch(0_0_0/30%),0_2px_6px_oklch(0_0_0/20%)] active:translate-y-0 active:shadow-[inset_0_1px_0_oklch(1_0_0/40%),0_1px_2px_oklch(0_0_0/20%)]",
        // AI Intelligence blue — high-emphasis secondary CTA
        accent:
          "bg-ai-blue text-black shadow-[inset_0_1px_0_oklch(1_0_0/25%)] hover:shadow-[0_0_24px_oklch(0.72_0.10_224/28%),0_0_56px_oklch(0.72_0.10_224/12%)] hover:-translate-y-px active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_oklch(0_0_0/30%)] hover:bg-destructive/90",
        outline:
          "border border-border bg-white/[0.02] text-foreground hover:bg-white/[0.06] hover:border-white/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-white/[0.08]",
        ghost: "text-foreground/70 hover:bg-white/[0.06] hover:text-foreground",
        link: "text-ai-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8.5 px-3 text-xs",
        xs: "h-7 px-2.5 text-[11px] rounded-lg",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
