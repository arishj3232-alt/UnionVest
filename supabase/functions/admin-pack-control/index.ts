/// <reference path="../deno.d.ts" />
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/adminAuth.ts";

type Action = "pause_pack" | "adjust_earning" | "terminate_order";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = await req.json();
    const action = body?.action as Action;

    if (action === "pause_pack") {
      const packId = String(body?.pack_id ?? "");
      const paused = Boolean(body?.paused);
      const note = typeof body?.admin_note === "string" ? body.admin_note : null;
      if (!packId) return jsonResponse({ error: "pack_id is required" }, 400);

      const { error } = await admin.adminClient.from("pack_controls").upsert({
        pack_id: packId,
        is_paused: paused,
        admin_note: note,
        updated_by: admin.userId,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "adjust_earning") {
      const packId = String(body?.pack_id ?? "");
      const daily = Number(body?.daily_earning);
      const note = typeof body?.admin_note === "string" ? body.admin_note : null;
      if (!packId || !Number.isFinite(daily) || daily < 0) {
        return jsonResponse({ error: "Invalid pack_id or daily_earning" }, 400);
      }

      const { error } = await admin.adminClient.from("pack_controls").upsert({
        pack_id: packId,
        daily_earning_override: daily,
        admin_note: note,
        updated_by: admin.userId,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "terminate_order") {
      const orderId = String(body?.order_id ?? "");
      const reason = typeof body?.reason === "string" ? body.reason : "Admin terminated early";
      if (!orderId) return jsonResponse({ error: "order_id is required" }, 400);

      const { error } = await admin.adminClient.rpc("admin_terminate_order_early", {
        p_admin_id: admin.userId,
        p_order_id: orderId,
        p_reason: reason,
      });
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 400);
  }
});
