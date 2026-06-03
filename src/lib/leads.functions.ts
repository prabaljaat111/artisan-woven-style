import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
});

const updateSchema = z.object({
  leadId: z.string().uuid(),
  conversation: z.array(messageSchema).max(100),
  status: z.enum(["new", "qualified", "callback_requested", "stylist_requested", "closed"]).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Append the latest conversation snapshot to an existing lead row.
 * Uses the admin client (server-only) because anon visitors cannot UPDATE
 * the leads table by policy. The leadId returned at insert time is treated
 * as a one-time handle for the active chat session.
 */
export const updateLeadConversation = createServerFn({ method: "POST" })
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      conversation: typeof data.conversation;
      updated_at: string;
      status?: string;
      notes?: string;
    } = {
      conversation: data.conversation,
      updated_at: new Date().toISOString(),
    };
    if (data.status) patch.status = data.status;
    if (data.notes) patch.notes = data.notes;
    const { error } = await supabaseAdmin
      .from("leads")
      .update(patch)
      .eq("id", data.leadId);
    if (error) {
      console.error("updateLeadConversation error", error);
      return { ok: false as const, error: "Could not update lead" };
    }
    return { ok: true as const };
  });