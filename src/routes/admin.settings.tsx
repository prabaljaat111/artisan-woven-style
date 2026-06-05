import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsShell,
  head: () => ({ meta: [{ title: "Settings · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});