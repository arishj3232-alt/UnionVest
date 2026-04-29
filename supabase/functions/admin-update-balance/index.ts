import { requireAdmin, corsHeaders, jsonResponse } from "../_shared/adminAuth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json().catch(() => null);
    const targetUserId = body?.target_user_id;
    const delta = Number(body?.delta);
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    if (typeof targetUserId !== "string" || !targetUserId) {
      return jsonResponse({ error: "target_user_id required" }, 400);
    }
    if (!Number.isFinite(delta) || delta === 0) {
      return jsonResponse({ error: "delta must be a non-zero number" }, 400);
    }
    if (Math.abs(delta) > 10_000_000) {
      return jsonResponse({ error: "delta exceeds safety cap" }, 400);
    }
    if (!reason || reason.trim().length < 3) {
      return jsonResponse({ error: "reason required (min 3 chars)" }, 400);
    }

    const { data, error } = await ctx.adminClient.rpc("admin_adjust_user_balance", {
      p_admin_id: ctx.userId,
      p_target_user_id: targetUserId,
      p_delta: delta,
      p_reason: reason,
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ success: true, new_balance: data });
  } catch (err) {
    console.error("admin-update-balance error", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});