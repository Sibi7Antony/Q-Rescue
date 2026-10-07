"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface TooltipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
}

export function TooltipButton({ label, children, active, className = "", ...props }: TooltipButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded border text-slate-100 transition ${
        active
          ? "border-cyan-300 bg-cyan-300/18 text-cyan-100 shadow-glow"
          : "border-slate-700/80 bg-slate-950/50 hover:border-cyan-300/70 hover:text-cyan-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}
