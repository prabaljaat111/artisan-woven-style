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
        <p>Indian Handicraft Standards has been championing authentic Lucknowi Chikankari since 2015. Highly rated on Amazon & Flipkart, we proudly served over <strong className="text-primary">10,000 customers</strong> across India between 2015 and 2020 — earning a reputation for honest pricing, genuine craft, and quiet luxury.</p>
        <p>After a three-year pause to rebuild our atelier and partner directly with a new generation of master artisans in Lucknow, we are back — better organized, more transparent, and ready to bring you the same heritage embroidery the brand was loved for.</p>
        <h2 className="font-display text-2xl text-primary mt-8">Our Craft</h2>
        <p>Chikankari is a 400-year-old hand embroidery tradition from Lucknow. Every motif — phanda, jaali, murri, bakhiya — is stitched entirely by hand by women artisans who learned it from their mothers. We pay fair wages and source directly, with no middlemen.</p>
        <h2 className="font-display text-2xl text-primary mt-8">Our Promise</h2>
        <p>If a piece doesn't live up to its photograph, return it within 7 days. No questions, no hassle.</p>
      </div>
    </div>
  );
}