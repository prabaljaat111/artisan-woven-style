import { createFileRoute } from "@tanstack/react-router";
import { adminPageMeta } from "@/lib/page-meta";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products_/new")({
  component: () => <ProductForm />,
  head: () => ({ meta: adminPageMeta("Add New Product") }),
});
