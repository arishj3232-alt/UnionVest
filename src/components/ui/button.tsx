import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { playClick } from "@/utils/soundEffects";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-valentine",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        valentine: "bg-gradient-to-r from-valentine-rose to-valentine-blush-dark text-primary-foreground shadow-valentine hover:shadow-lg hover:animate-heartbeat active:scale-[0.98]",
        rose: "bg-gradient-to-r from-valentine-rose-dark to-valentine-rose text-primary-foreground shadow-rose hover:shadow-lg hover:animate-heartbeat active:scale-[0.98]",
        blush: "bg-gradient-to-r from-valentine-blush to-valentine-warm text-foreground shadow-valentine hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] font-semibold",
        warm: "bg-gradient-to-r from-valentine-warm to-valentine-warm-dark text-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        heart: "bg-gradient-to-r from-valentine-rose to-valentine-rose-dark text-primary-foreground shadow-rose hover:shadow-glow-rose hover:animate-heartbeat active:scale-[0.95] rounded-[50%_50%_50%_50%/60%_60%_40%_40%]",
        "outline-rose": "border-2 border-valentine-rose text-valentine-rose hover:bg-valentine-rose/10 hover:shadow-rose",
        "outline-blush": "border-2 border-valentine-blush text-valentine-blush-dark hover:bg-valentine-blush/10",
        // Legacy variants mapped to new theme
        newyear: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-colors duration-200",
        christmas: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-colors duration-200",
        gold: "bg-foreground text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-colors duration-200 font-bold",
        green: "bg-foreground text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-colors duration-200",
        festive: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-colors duration-200 uppercase tracking-wider font-bold",
        "outline-gold": "border-2 border-valentine-rose text-valentine-rose hover:bg-valentine-rose/10 hover:shadow-rose",
        "outline-christmas": "border-2 border-valentine-blush-dark text-valentine-blush-dark hover:bg-valentine-blush/10",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
        heart: "h-14 w-14 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]",
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
  enableSound?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, enableSound = true, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableSound) {
        playClick();
      }
      onClick?.(e);
    };
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
