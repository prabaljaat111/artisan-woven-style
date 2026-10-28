import { createFileRoute } from "@tanstack/react-router";
import { adminPageMeta } from "@/lib/page-meta";
import { FeedPage } from "@/components/admin/FeedPage";

export const Route = createFileRoute("/admin/google-merchant")({
  component: () => <FeedPage kind="google" />,
  head: () => ({ meta: adminPageMeta("Google Merchant Center") }),
});
