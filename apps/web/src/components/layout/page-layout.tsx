import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface PageLayoutProps {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[80rem]",
  full: "max-w-full",
}

export function PageLayout({
  children,
  className,
  maxWidth = "lg",
}: PageLayoutProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 py-8", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  )
}