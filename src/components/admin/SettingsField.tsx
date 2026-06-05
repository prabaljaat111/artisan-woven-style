import { ReactNode } from "react";

export function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{label}</div>
      {children}
      {hint && !error && <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{hint}</div>}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
      <header>
        <h2 className="font-display text-lg text-primary">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl text-primary">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ComingSoon({ title, description, requires }: { title: string; description: string; requires?: string[] }) {
  return (
    <div className="bg-cream border border-dashed border-border rounded-xl p-8 text-center">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Coming soon</div>
      <h3 className="font-display text-xl text-primary mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      {requires && requires.length > 0 && (
        <div className="mt-5 text-xs text-muted-foreground">
          <div className="font-semibold mb-1">Requires</div>
          <ul className="space-y-0.5">{requires.map((r) => <li key={r}>· {r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}