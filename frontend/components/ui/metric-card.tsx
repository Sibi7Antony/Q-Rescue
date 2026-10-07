"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  tone?: "cyan" | "violet" | "red" | "amber" | "green";
  trend?: "up" | "down" | "flat";
}

const toneAccents = {
  cyan: { bg: "bg-[#7FDBFF]", border: "border-[#0074D9]" },
  violet: { bg: "bg-[#B10DC9]", border: "border-[#B10DC9]" },
  red: { bg: "bg-[#ff4136]", border: "border-[#ff4136]" },
  amber: { bg: "bg-[#fae315]", border: "border-black" },
  green: { bg: "bg-[#2ECC40]", border: "border-black" }
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus
};

export function MetricCard({ label, value, suffix = "", tone = "cyan", trend }: MetricCardProps) {
  const numeric = typeof value === "number" ? value : null;
  const spring = useSpring(numeric ?? 0, { stiffness: 90, damping: 24 });
  const display = useTransform(spring, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (numeric !== null) {
      spring.set(numeric);
    }
  }, [numeric, spring]);

  const TrendIcon = trend ? trendIcons[trend] : null;
  const accent = toneAccents[tone] ?? toneAccents.cyan;

  return (
    <motion.div
      layout
      className="brutal-card relative flex h-full min-h-[112px] flex-col justify-between overflow-hidden bg-white p-3.5 text-black"
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${accent.bg}`} />

      {/* Header: Label + Square indicator */}
      <div className="flex h-5 items-center justify-between gap-1.5">
        <p className="font-mono text-[0.66rem] font-black uppercase tracking-wider text-black truncate" title={label}>
          {label}
        </p>
        <span className={`inline-block h-2 w-2 shrink-0 border border-black ${accent.bg}`} />
      </div>

      {/* Metric Value + Right Accessory Tag to fill the box */}
      <div className="mt-2 flex items-baseline justify-between gap-1.5">
        <div className="flex items-baseline gap-1 font-mono font-black text-black">
          <span className="text-3xl xl:text-[2rem] leading-none tracking-tight">
            {numeric !== null ? <motion.span>{display}</motion.span> : <span>{value}</span>}
          </span>
          {suffix && <span className="text-sm font-black text-black/70 leading-none">{suffix}</span>}
        </div>

        {TrendIcon && trend ? (
          <div className="flex shrink-0 items-center gap-1 border-2 border-black bg-white px-1.5 py-0.5 text-[10px] font-mono font-black shadow-[2px_2px_0_0_#000]">
            <TrendIcon size={12} strokeWidth={3.5} className={trend === "up" ? "text-[#ff4136]" : trend === "down" ? "text-[#2ECC40]" : "text-black"} />
            <span>{trend === "up" ? "HIGH" : trend === "down" ? "NORM" : "STBL"}</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center border border-black/30 bg-black/5 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-black/60">
            LIVE
          </div>
        )}
      </div>
    </motion.div>
  );
}
