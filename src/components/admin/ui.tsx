import type { ReactNode } from "react";

export const inr = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const tones = {
  green: "bg-status-green/10 text-status-green",
  orange: "bg-status-orange/10 text-status-orange",
  red: "bg-status-red/10 text-status-red",
  blue: "bg-status-blue/10 text-status-blue",
  gray: "bg-muted text-muted-foreground",
} as const;

export function Chip({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

export function statusTone(s: string): keyof typeof tones {
  if (["active", "approved", "in_stock"].includes(s)) return "green";
  if (["pending_review", "low"].includes(s)) return "orange";
  if (["rejected", "out", "inactive"].includes(s)) return "red";
  if (s === "draft") return "blue";
  return "gray";
}

export function stockChip(stock: number, reorder = 5) {
  if (stock <= 0) return <Chip tone="red">Out of Stock</Chip>;
  if (stock <= reorder) return <Chip tone="orange">Low Stock</Chip>;
  return <Chip tone="green">In Stock</Chip>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card rounded-xl border border-border/60 shadow-[var(--shadow-admin-card)] ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-3xl text-admin-nav">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export const btnPrimary = "inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-admin-nav text-admin-nav-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm hover:bg-secondary disabled:opacity-50";
export const inputCls = "h-10 px-3 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring/30";
