"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Stepper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
))
Stepper.displayName = "Stepper"

const StepperItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isCompleted?: boolean
    isActive?: boolean
  }
>(({ className, isCompleted, isActive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center",
      className
    )}
    {...props}
  />
))
StepperItem.displayName = "StepperItem"

const StepperSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-px bg-border flex-1", className)}
    {...props}
  />
))
StepperSeparator.displayName = "StepperSeparator"

export { Stepper, StepperItem, StepperSeparator }