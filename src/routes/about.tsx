import { createFileRoute } from "@tanstack/react-router";
import { LotusMark } from "@/components/LotusMark";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({ meta: [{ title: "About — Indian Handicraft Standards" }, { name: "description", content: "Championing authentic Lucknowi Chikankari since 2015." }] }),
});

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center">
        <LotusMark className="h-10 w-10 text-gold mx-auto" />
        <h1 className="font-display text-4xl md:text-5xl text-primary mt-4">Our Story</h1>
        <div className="gold-underline w-24 mx-auto mt-3" />
      </div>
      <div className="prose prose-stone max-w-none mt-10 text-foreground/85 leading-relaxed space-y-5">
        <p>Indian Handicraft Standards has been championing authentic Lucknowi Chikankari since 2015. Between 2015 and 2020 we proudly served over <strong className="text-primary">10,000 customers</strong> across Amazon, Flipkart and IndiaMART — earning a reputation for honest pricing, genuine craft and quiet luxury.</p>
        <p>After a three-year pause to rebuild our atelier and partner directly with a new generation of master artisans in Lucknow, we are back — better organized, more transparent, and ready to bring you the same heritage embroidery the brand was loved for.</p>
        <div className="not-prose grid grid-cols-3 gap-3 my-6">
          {[
            { v: "10,000+", l: "Happy customers" },
            { v: "4.2★", l: "Seller rating (Amazon)" },
            { v: "4.1★", l: "Avg. product rating" },
          ].map((s) => (
            <div key={s.l} className="bg-secondary/50 border border-gold/30 rounded-2xl p-4 text-center">
              <div className="font-display text-2xl md:text-3xl text-primary">{s.v}</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1 leading-tight">{s.l}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">Ratings reflect our historical marketplace performance (2015–2020).</p>
        <h2 className="font-display text-2xl text-primary mt-8">Our Craft</h2>
        <p>Chikankari is a 400-year-old hand embroidery tradition from Lucknow. Every motif — phanda, jaali, murri, bakhiya — is stitched entirely by hand by women artisans who learned it from their mothers. We pay fair wages and source directly, with no middlemen.</p>
        <h2 className="font-display text-2xl text-primary mt-8">Our Promise</h2>
        <p>If a piece doesn't live up to its photograph, return it within 7 days. No questions, no hassle.</p>
      </div>
    </div>
  );
}