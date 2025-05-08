import * as React from "react"
import { cn } from "../../lib/utils"

// Enkel implementasjon uten @radix-ui/react-tabs
const Tabs = React.forwardRef(({ defaultValue, value, onValueChange, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "")

    React.useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value)
        }
    }, [value])

    const handleValueChange = React.useCallback((newValue) => {
        setSelectedValue(newValue)
        onValueChange?.(newValue)
    }, [onValueChange])

    return (
        <div
            ref={ref}
            {...props}
            data-state={selectedValue ? "active" : "inactive"}
            data-value={selectedValue}
            data-orientation="horizontal"
        >
            {React.Children.map(props.children, child => {
                if (!React.isValidElement(child)) return child

                if (child.type === TabsList || child.type === TabsContent) {
                    return React.cloneElement(child, {
                        selectedValue,
                        onSelect: handleValueChange,
                    })
                }

                return child
            })}
        </div>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, selectedValue, onSelect, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            className
        )}
        role="tablist"
        {...props}
    >
        {React.Children.map(props.children, child => {
            if (!React.isValidElement(child) || child.type !== TabsTrigger) return child

            return React.cloneElement(child, {
                selectedValue,
                onSelect,
            })
        })}
    </div>
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, selectedValue, onSelect, ...props }, ref) => {
    const isSelected = selectedValue === value

    return (
        <button
            ref={ref}
            role="tab"
            type="button"
            aria-selected={isSelected}
            data-state={isSelected ? "active" : "inactive"}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isSelected && "bg-background text-foreground shadow-sm",
                className
            )}
            onClick={() => onSelect?.(value)}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, selectedValue, ...props }, ref) => {
    const isSelected = selectedValue === value

    if (!isSelected) return null

    return (
        <div
            ref={ref}
            role="tabpanel"
            data-state={isSelected ? "active" : "inactive"}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent } 