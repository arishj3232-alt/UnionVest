import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AdminContext {
  userId: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

/**
 * Validates the caller is authenticated AND has an admin role
 * (super_admin or finance via is_admin()). Fails fast with 401/403.
 * Optionally requires the super_admin role for destructive actions.
 */
export async function requireAdmin(
  req: Request,
  options: { requireSuperAdmin?: boolean } = {}
): Promise<AdminContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  if (options.requireSuperAdmin) {
    const { data: isSuper, error } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (error || !isSuper) return jsonResponse({ error: "Forbidden" }, 403);
  } else {
    const { data: isAdmin, error } = await userClient.rpc("is_admin", { _user_id: user.id });
    if (error || !isAdmin) return jsonResponse({ error: "Forbidden" }, 403);
  }

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return { userId: user.id, userClient, adminClient };
}