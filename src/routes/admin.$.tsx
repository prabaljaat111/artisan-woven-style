import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { adminPageMeta } from "@/lib/page-meta";
import { Card } from "@/components/admin/ui";

const TITLES: Record<string, string> = {
  returns: "Returns & Refunds",
  "google-merchant": "Google Merchant Center",
  "meta-catalog": "Meta & WhatsApp Catalog",
  media: "Media Library",
};

export const Route = createFileRoute("/admin/$")({
  component: MissingPage,
  head: () => ({ meta: adminPageMeta("Page Not Found") }),
});

function MissingPage() {
  const { _splat } = Route.useParams();
  const title = "Page not found";
  return (
    <Card className="p-10 text-center max-w-xl mx-auto mt-10">
      <SearchX className="h-10 w-10 mx-auto text-status-orange mb-3" />
      <h1 className="font-display text-3xl text-admin-nav">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2">This admin page does not exist.</p>
      <Link to="/admin" className="inline-block mt-5 text-sm underline">Back to dashboard</Link>
    </Card>
  );
}
