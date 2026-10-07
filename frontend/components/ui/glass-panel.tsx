import type { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "alert" | "quantum";
}

const variantClasses = {
  default: "brutal-card bg-white text-black",
  alert: "brutal-card bg-[#ff4136] text-white",
  quantum: "brutal-card bg-[#fae315] text-black"
};

export function GlassPanel({ title, eyebrow, action, children, className = "", variant = "default" }: GlassPanelProps) {
  return (
    <section className={`${variantClasses[variant]} p-5 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b-[3px] border-black pb-3">
          <div>
            {eyebrow && <p className="font-mono text-[0.75rem] font-black uppercase tracking-[0.22em] opacity-70">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-xl font-black uppercase">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
