/// <reference path="../deno.d.ts" />
import { requireAdmin, corsHeaders, jsonResponse } from "../_shared/adminAuth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await requireAdmin(req, { requireSuperAdmin: true });
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => null);
    const targetUserId = body?.target_user_id;
    const disabled = Boolean(body?.disabled);
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    if (typeof targetUserId !== "string" || !targetUserId) {
      return jsonResponse({ error: "target_user_id required" }, 400);
    }
    if (!reason || reason.trim().length < 3) {
      return jsonResponse({ error: "reason required (min 3 chars)" }, 400);
    }
    if (targetUserId === ctx.userId) {
      return jsonResponse({ error: "Cannot disable your own account" }, 400);
    }

    const { error } = await ctx.adminClient.rpc("admin_set_user_disabled", {
      p_admin_id: ctx.userId,
      p_target_user_id: targetUserId,
      p_disabled: disabled,
      p_reason: reason,
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("admin-disable-user error", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});