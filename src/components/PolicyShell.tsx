export function PolicyShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-8">
        {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-accent">{eyebrow}</p>}
        <h1 className="font-display italic text-4xl md:text-5xl text-primary mt-2">{title}</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
      </div>
      <article className="max-w-none text-foreground/85 [&_h3]:font-display [&_h3]:text-primary [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-3 [&_p]:text-sm md:[&_p]:text-base leading-relaxed">
        {children}
      </article>
    </div>
  );
}