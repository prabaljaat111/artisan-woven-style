import { useQuery } from "@tanstack/react-query";
import { listPublishedCategories } from "@/lib/storefront.functions";

export function useStorefrontCategories() {
  return useQuery({ queryKey: ["storefront-categories"], queryFn: () => listPublishedCategories(), refetchInterval: 30_000 }).data ?? [];
}