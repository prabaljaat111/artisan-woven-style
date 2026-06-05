import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler } from "lucide-react";
import type { ReactNode } from "react";

const topwear = [
  { size: "XS", bust: 34, waist: 28, hip: 36, length: 38 },
  { size: "S", bust: 36, waist: 30, hip: 38, length: 38 },
  { size: "M", bust: 38, waist: 32, hip: 40, length: 39 },
  { size: "L", bust: 40, waist: 34, hip: 42, length: 39 },
  { size: "XL", bust: 42, waist: 36, hip: 44, length: 40 },
  { size: "2XL", bust: 44, waist: 38, hip: 46, length: 40 },
  { size: "3XL", bust: 46, waist: 40, hip: 48, length: 41 },
];
const bottomwear = [
  { size: "XS", waist: 28, hip: 36, length: 38 },
  { size: "S", waist: 30, hip: 38, length: 38 },
  { size: "M", waist: 32, hip: 40, length: 39 },
  { size: "L", waist: 34, hip: 42, length: 39 },
  { size: "XL", waist: 36, hip: 44, length: 40 },
  { size: "2XL", waist: 38, hip: 46, length: 40 },
  { size: "3XL", waist: 40, hip: 48, length: 41 },
];
const plusSize = [
  { size: "4XL", bust: 48, waist: 42, hip: 50, length: 41 },
  { size: "5XL", bust: 50, waist: 44, hip: 52, length: 42 },
  { size: "6XL", bust: 52, waist: 46, hip: 54, length: 42 },
];

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-primary">
          <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border odd:bg-cream/40">
              {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SizeGuideDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2"><Ruler className="h-5 w-5 text-gold" /> Size Guide</DialogTitle>
          <p className="text-xs text-muted-foreground">All measurements are in inches. Garment measurements may vary by ±0.5".</p>
        </DialogHeader>
        <Tabs defaultValue="top" className="mt-2">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1">
            <TabsTrigger value="top" className="text-xs sm:text-sm whitespace-normal py-2">Top Wear</TabsTrigger>
            <TabsTrigger value="bottom" className="text-xs sm:text-sm whitespace-normal py-2">Bottom</TabsTrigger>
            <TabsTrigger value="plus" className="text-xs sm:text-sm whitespace-normal py-2">Plus Size</TabsTrigger>
            <TabsTrigger value="how" className="text-xs sm:text-sm whitespace-normal py-2">How to Measure</TabsTrigger>
          </TabsList>
          <TabsContent value="top" className="space-y-4">
            <Table headers={["Size", "Bust", "Waist", "Hip", "Length"]} rows={topwear.map((r) => [r.size, r.bust, r.waist, r.hip, r.length])} />
            <div className="bg-cream/60 border border-border rounded-lg p-3 text-xs text-foreground/80">
              <p className="font-semibold text-primary mb-1">Shopping Tip</p>
              If your bust is 36 inches, choose <strong>M</strong> for a fitted look or <strong>L</strong> for a relaxed fit.
            </div>
          </TabsContent>
          <TabsContent value="bottom" className="space-y-4">
            <Table headers={["Size", "Waist", "Hip", "Length"]} rows={bottomwear.map((r) => [r.size, r.waist, r.hip, r.length])} />
          </TabsContent>
          <TabsContent value="plus" className="space-y-4">
            <Table headers={["Size", "Bust", "Waist", "Hip", "Length"]} rows={plusSize.map((r) => [r.size, r.bust, r.waist, r.hip, r.length])} />
          </TabsContent>
          <TabsContent value="how" className="space-y-4 text-sm text-foreground/85">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { t: "Bust", d: "Measure the fullest part of your bust, keeping the tape parallel to the floor." },
                { t: "Waist", d: "Measure around the narrowest part of your natural waistline." },
                { t: "Hip", d: "Stand with feet together and measure around the fullest part of your hips." },
                { t: "Length", d: "Measure from the shoulder seam straight down to your desired hemline." },
              ].map((x) => (
                <div key={x.t} className="border border-border rounded-lg p-3">
                  <p className="font-semibold text-primary">{x.t}</p>
                  <p className="text-xs text-muted-foreground mt-1">{x.d}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="font-semibold text-primary mb-2">Fit Guide</p>
              <ul className="text-xs space-y-1 text-foreground/80">
                <li><strong>Slim Fit</strong> — Closer to the body, choose your exact size.</li>
                <li><strong>Regular Fit</strong> — Standard comfortable fit, true to size.</li>
                <li><strong>Relaxed Fit</strong> — Easy, breezy fit — size up for extra room.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}