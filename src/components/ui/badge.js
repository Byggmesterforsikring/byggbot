import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary-dark",
        secondary:
          "bg-secondary text-white hover:bg-secondary-dark",
        outline:
          "text-text-primary bg-transparent border border-gray-200 hover:bg-gray-100",
        success:
          "bg-green-100 text-green-800 hover:bg-green-200",
        warning:
          "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        error:
          "bg-red-100 text-red-800 hover:bg-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
