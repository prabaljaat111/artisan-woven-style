import { createFileRoute, Link } from "@tanstack/react-router";
import { Ruler, Info } from "lucide-react";

export const Route = createFileRoute("/size-guide")({
  component: SizeGuidePage,
  head: () => ({
    meta: [
      { title: "Size Guide — Indian Handicraft Standards" },
      { name: "description", content: "Complete size chart for Chikankari kurtis, kurta sets, palazzos, sharara, garara and bottoms. Top wear XS–3XL, plus size 4XL–7XL, and bottom wear measurements in inches." },
      { property: "og:title", content: "Size Guide — Indian Handicraft Standards" },
      { property: "og:description", content: "How to measure yourself and choose the perfect Chikankari fit." },
      { property: "og:url", content: "/size-guide" },
    ],
    links: [{ rel: "canonical", href: "/size-guide" }],
  }),
});

const TOP_WEAR = [
  ["XS", 34, 32, 36],
  ["S", 36, 34, 38],
  ["M", 38, 36, 40],
  ["L", 40, 38, 42],
  ["XL", 42, 40, 44],
  ["2XL", 44, 42, 46],
  ["3XL", 46, 44, 48],
];

const PLUS_SIZE = [
  ["4XL", 48, 46, 50],
  ["5XL", 50, 48, 52],
  ["6XL", 52, 50, 54],
  ["7XL", 54, 52, 56],
];

const BOTTOM_WEAR = [
  ["XS", 26, 36, 27],
  ["S", 28, 38, 27],
  ["M", 30, 40, 27],
  ["L", 32, 42, 27],
  ["XL", 34, 44, 27],
  ["2XL", 36, 46, 27],
  ["3XL", 38, 48, 27],
];

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? "bg-secondary/40" : "bg-card"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 border-t border-border">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SizeGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-10">
        <Ruler className="h-8 w-8 text-gold mx-auto" />
        <p className="text-xs uppercase tracking-[0.3em] text-accent mt-3">Find your fit</p>
        <h1 className="font-display italic text-4xl md:text-5xl text-primary mt-2">Size Guide</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
        <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
          Selecting the right size is important for the perfect balance of comfort, fit and style. All measurements are in <strong>inches</strong> and represent <strong>garment-flat</strong> measurements.
        </p>
      </div>

      {/* Fit guidance */}
      <section className="bg-secondary/40 border border-border rounded-2xl p-5 md:p-6 mb-10">
        <h2 className="font-display text-2xl text-primary">Understand the fit you want</h2>
        <ul className="mt-3 space-y-2 text-sm text-foreground/85">
          <li><strong>Fitted look:</strong> choose a garment <strong>2 inches larger</strong> than your bust for a body-hugging fit.</li>
          <li><strong>Relaxed fit (recommended):</strong> choose a garment <strong>4 inches larger</strong> than your bust — the breezy, ideal fit for Chikankari.</li>
        </ul>
        <div className="mt-4 bg-card border border-gold/30 rounded-lg p-3 text-sm">
          <span className="font-medium text-primary">Example —</span> If your bust is <strong>36"</strong>: <em>M / 38</em> = fitted look · <em>L / 40</em> = relaxed look.
        </div>
      </section>

      {/* How to measure */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-primary mb-3">Take accurate body measurements</h2>
        <p className="text-sm text-muted-foreground mb-4">Use a measuring tape and measure carefully.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Bust", tip: "Measure around the fullest part of your chest. Tape snug, not tight." },
            { label: "Waist", tip: "Measure around your natural waistline, just above the belly button." },
            { label: "Hip", tip: "Measure around the fullest part of your hips, ~8 inches below your waist." },
          ].map((m) => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-4">
              <div className="text-gold text-xs uppercase tracking-[0.2em]">{m.label}</div>
              <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{m.tip}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Use your <strong>bust</strong> measurement for tops/kurtis. Use your <strong>waist &amp; hip</strong> for bottoms (pants, palazzos, sharara).
        </p>
      </section>

      {/* Top wear */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-primary mb-3">Top Wear</h2>
        <Table headers={["Size", "Bust", "Waist", "Hip"]} rows={TOP_WEAR} />
      </section>

      {/* Plus size */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-primary mb-3">Plus Size</h2>
        <Table headers={["Size", "Bust", "Waist", "Hip"]} rows={PLUS_SIZE} />
      </section>

      {/* Bottom wear */}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-primary mb-3">Bottom Wear</h2>
        <Table headers={["Size", "Waist", "Hip", "Inseam"]} rows={BOTTOM_WEAR} />
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-gold text-xs uppercase tracking-[0.2em]">Palazzo length</div>
            <p className="text-foreground/85 mt-1">~ 38 inches (approx.)</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-gold text-xs uppercase tracking-[0.2em]">Pant length</div>
            <p className="text-foreground/85 mt-1">~ 36 inches (approx.)</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">Length and fit may vary slightly depending on fabric and style.</p>
      </section>

      {/* Important tips */}
      <section className="bg-cream border border-gold/40 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-gold" />
          <h2 className="font-display text-2xl text-primary">Important tips</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-foreground/85 list-disc list-inside leading-relaxed">
          <li>If your measurements fall <strong>between two sizes</strong>, pick the <strong>larger</strong> for a more comfortable fit.</li>
          <li>A larger garment can always be altered down; a smaller one is hard to adjust.</li>
          <li>For a larger tummy, waist or hips, measure those areas carefully and consider sizing up — especially for bottoms.</li>
          <li>Our garments have little to no seam margin, so select your size carefully.</li>
          <li>Every piece is <strong>handmade and hand-stitched</strong>; slight measurement variations may occur.</li>
          <li>If the fit isn't perfect, minor alterations can be done easily — especially with a larger size.</li>
          <li>Fabric (cotton, rayon, modal, chanderi) and silhouette can affect how the outfit falls.</li>
          <li>Refer to each product description for length details.</li>
        </ul>
      </section>

      <div className="text-center mt-10 text-sm text-muted-foreground">
        Still unsure? <a href="https://wa.me/919044466957" target="_blank" rel="noreferrer" className="text-primary underline">WhatsApp us your measurements</a> — we'll recommend the perfect size. Or <Link to="/contact" className="text-primary underline">contact our concierge</Link>.
      </div>
    </div>
  );
}