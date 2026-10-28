import { createFileRoute } from "@tanstack/react-router";
import { adminPageMeta } from "@/lib/page-meta";
import { FeedPage } from "@/components/admin/FeedPage";

export const Route = createFileRoute("/admin/meta-catalog")({
  component: () => <FeedPage kind="meta" />,
  head: () => ({ meta: adminPageMeta("Meta & WhatsApp Catalog") }),
});
