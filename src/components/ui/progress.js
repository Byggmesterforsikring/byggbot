import * as React from "react";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ 
  className, 
  value = 0, 
  max = 100,
  backgroundColor = "rgba(0, 0, 0, 0.05)",
  color,
  height = "10px",
  ...props 
}, ref) => {
  // Calculate percentage
  const percentage = value && max ? Math.min(Math.max(0, value / max * 100), 100) : 0;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full",
        className
      )}
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      style={{ height, backgroundColor }}
      {...props}
    >
      <div
        className="h-full w-full flex-1 transition-all duration-300 ease-in-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
});

Progress.displayName = "Progress";

export { Progress };