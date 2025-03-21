import * as React from "react"
import { cn } from "./utils"
import { Button } from "./button"

const ButtonWithIcon = React.forwardRef(({ className, icon, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {icon}
      {children}
    </Button>
  )
})
ButtonWithIcon.displayName = "ButtonWithIcon"

export { ButtonWithIcon }