import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsShell,
  head: () => ({ meta: adminPageMeta("Settings Settings") }),
});