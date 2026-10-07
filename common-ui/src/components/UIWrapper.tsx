import * as React from "react"
import { cn } from "../lib/utils"

export interface UIWrapperProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
  centered?: boolean
}

/**
 * UIWrapper - A common wrapper component for AI agent projects
 * 
 * This component provides a consistent layout and styling foundation
 * while allowing each AI agent project to render their own content.
 * 
 * @param children - The content to be rendered inside the wrapper
 * @param className - Additional CSS classes to apply
 * @param fullWidth - Whether to use full width (default: false)
 * @param centered - Whether to center the content (default: true)
 */
export const UIWrapper: React.FC<UIWrapperProps> = ({
  children,
  className,
  fullWidth = false,
  centered = true,
}) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground dark",
        centered && "flex items-center justify-center",
        className
      )}
    >
      <div
        className={cn(
          "w-full",
          !fullWidth && "max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
        )}
      >
        {children}
      </div>
    </div>
  )
}

UIWrapper.displayName = "UIWrapper"
