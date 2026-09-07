"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "accent";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:pointer-events-none disabled:opacity-50 select-none backdrop-blur-xl dark:focus-visible:ring-teal-400/60";

    const variantStyles = {
      default: "bg-white/80 text-slate-800 border border-white/70 shadow-[0_12px_34px_-20px_rgba(15,23,42,0.28)] hover:bg-white hover:border-teal-200 hover:text-slate-900 active:translate-y-px dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/80 dark:shadow-[0_14px_38px_-24px_rgba(2,6,23,0.85)] dark:hover:bg-slate-900 dark:hover:border-teal-400/30 dark:hover:text-white",
      destructive: "bg-rose-500/90 text-white border border-rose-400/70 shadow-[0_12px_30px_-18px_rgba(244,63,94,0.55)] hover:bg-rose-500 active:translate-y-px dark:bg-rose-500/95 dark:border-rose-300/40 dark:hover:bg-rose-400",
      outline: "border border-slate-200/80 bg-white/60 text-slate-700 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.2)] hover:bg-white/80 hover:border-teal-200 hover:text-slate-900 active:translate-y-px dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900/80 dark:hover:border-teal-400/30 dark:hover:text-white",
      secondary: "bg-slate-100/80 text-slate-700 border border-slate-200/80 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.2)] hover:bg-white hover:text-slate-900 active:translate-y-px dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-white",
      ghost: "text-slate-600 hover:text-slate-900 hover:bg-white/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80",
      link: "text-teal-700 underline-offset-4 hover:underline p-0 h-auto bg-transparent border-0 shadow-none dark:text-teal-300",
      accent: "bg-emerald-500/90 text-slate-950 border border-emerald-400/70 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.38)] hover:bg-emerald-400 active:translate-y-px dark:bg-emerald-500/90 dark:text-slate-950 dark:border-emerald-300/40 dark:hover:bg-emerald-400",
    }[variant];

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-xs",
      sm: "h-8 rounded-lg px-3 text-[11px]",
      lg: "h-12 rounded-2xl px-8 text-sm",
      icon: "h-10 w-10 p-0",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
