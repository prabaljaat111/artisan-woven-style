import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminPageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm, fromRow } from "@/components/admin/ProductForm";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/products_/$id")({
  component: EditProductPage,
  head: () => ({ meta: adminPageMeta("Edit Product") }),
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["product-edit", id],
    queryFn: async () => {
      const [{ data: p, error }, { data: v }] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).maybeSingle(),
        supabase.from("product_variants").select("size, color, sku, price, sale_price, stock, image_url, status").eq("product_id", id).order("created_at"),
      ]);
      if (error) throw error;
      return { p, v: v ?? [] };
    },
  });
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-[480px]" /></div>;
  if (!data?.p) return <div className="text-sm">Product not found. <Link to="/admin/products" className="underline">Back to products</Link></div>;
  return (
    <ProductForm
      key={id}
      productId={id}
      initial={fromRow(data.p)}
      rejectionReason={data.p.rejection_reason}
      initialVariations={data.v.map((x) => ({ size: x.size, color: x.color, sku: x.sku ?? "", price: x.price?.toString() ?? "", sale_price: x.sale_price?.toString() ?? "", stock: String(x.stock ?? 0), image_url: x.image_url ?? "", status: x.status === "inactive" ? "inactive" as const : "active" as const }))}
    />
  );
}
