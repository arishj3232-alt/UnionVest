/// <reference path="../deno.d.ts" />
import { requireAdmin, corsHeaders, jsonResponse } from "../_shared/adminAuth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await requireAdmin(req, { requireSuperAdmin: true });
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => null);
    const targetUserId = body?.target_user_id;
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    if (typeof targetUserId !== "string" || !targetUserId) {
      return jsonResponse({ error: "target_user_id required" }, 400);
    }
    if (!reason || reason.trim().length < 3) {
      return jsonResponse({ error: "reason required (min 3 chars)" }, 400);
    }
    if (targetUserId === ctx.userId) {
      return jsonResponse({ error: "Cannot delete your own account" }, 400);
    }

    const { error: delError } = await ctx.adminClient.auth.admin.deleteUser(targetUserId);
    if (delError) return jsonResponse({ error: delError.message }, 400);

    // Best-effort audit log entry.
    await ctx.adminClient.from("admin_audit_log").insert({
      admin_user_id: ctx.userId,
      action: "delete_user",
      table_name: "auth.users",
      record_id: targetUserId,
      new_values: { deleted: true },
      notes: reason,
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("admin-delete-user error", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

