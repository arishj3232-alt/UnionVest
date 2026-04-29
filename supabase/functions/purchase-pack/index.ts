import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pack definitions (must match frontend)
const packs = [
  { id: 'silver-1', name: 'Apprentice Tier', category: 'silver', level: 1, price: 1099, dailyEarning: 560, duration: 28, totalRevenue: 15680 },
  { id: 'silver-2', name: 'Worker Tier', category: 'silver', level: 2, price: 1499, dailyEarning: 700, duration: 28, totalRevenue: 19600 },
  { id: 'silver-3', name: 'Craftsman Tier', category: 'silver', level: 3, price: 2700, dailyEarning: 1000, duration: 28, totalRevenue: 28000 },
  { id: 'silver-4', name: 'Foreman Tier', category: 'silver', level: 4, price: 3500, dailyEarning: 1500, duration: 28, totalRevenue: 42000 },
  { id: 'silver-5', name: 'Union Tier', category: 'silver', level: 5, price: 3700, dailyEarning: 2200, duration: 28, totalRevenue: 61600 },
  { id: 'gold-1', name: 'Engineer Plan', category: 'gold', level: 1, price: 5201, dailyEarning: 3500, duration: 7, totalRevenue: 24500, requiredLevel: 1 },
  { id: 'gold-2', name: 'Operator Plan', category: 'gold', level: 2, price: 6001, dailyEarning: 4500, duration: 7, totalRevenue: 31500, requiredLevel: 2 },
  { id: 'gold-3', name: 'Supervisor Plan', category: 'gold', level: 3, price: 6800, dailyEarning: 7000, duration: 7, totalRevenue: 49000, requiredLevel: 3 },
  { id: 'gold-4', name: 'Director Plan', category: 'gold', level: 4, price: 11500, dailyEarning: 15000, duration: 4, totalRevenue: 60000, requiredLevel: 4 },
  { id: 'gold-5', name: 'Executive Plan', category: 'gold', level: 5, price: 14300, dailyEarning: 20000, duration: 4, totalRevenue: 80000, requiredLevel: 5 },
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Purchase request from user: ${user.id}`);

    // Parse request body
    const body = await req.json();
    const pack_id = body?.pack_id;
    const quantityRaw = body?.quantity ?? 1;
    const quantity = Number.isInteger(quantityRaw) ? quantityRaw : parseInt(quantityRaw, 10);

    if (!pack_id || typeof pack_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid pack_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return new Response(
        JSON.stringify({ error: "Quantity must be an integer between 1 and 50" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find pack
    const pack = packs.find(p => p.id === pack_id);
    if (!pack) {
      console.error("Pack not found:", pack_id);
      return new Response(
        JSON.stringify({ error: "Pack not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional admin controls: pause pack and/or override daily earning.
    const { data: control } = await supabase
      .from("pack_controls")
      .select("is_paused, daily_earning_override, duration_override, price_override, total_revenue_override")
      .eq("pack_id", pack.id)
      .maybeSingle();

    if (control?.is_paused) {
      return new Response(
        JSON.stringify({ error: "This pack is currently paused by admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveDailyEarning =
      control?.daily_earning_override != null
        ? Number(control.daily_earning_override)
        : pack.dailyEarning;
    const effectiveDuration =
      control?.duration_override != null
        ? Number(control.duration_override)
        : pack.duration;
    const effectiveUnitPrice =
      control?.price_override != null
        ? Number(control.price_override)
        : pack.price;
    const effectiveTotalRevenue =
      control?.total_revenue_override != null
        ? Number(control.total_revenue_override)
        : effectiveDailyEarning * effectiveDuration;

    console.log(`Processing purchase for pack: ${pack.name} (${pack.id}) x${quantity}`);

    // For gold packs, verify user has required silver level
    if (pack.category === "gold" && pack.requiredLevel) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("pack_level")
        .eq("user_id", user.id)
        .eq("pack_category", "silver")
        .order("pack_level", { ascending: false })
        .limit(1);

      if (ordersError) {
        console.error("Error checking user level:", ordersError.message);
        return new Response(
          JSON.stringify({ error: "Failed to verify user level" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userSilverLevel = orders?.[0]?.pack_level || 0;
      if (userSilverLevel < pack.requiredLevel) {
        console.error(`User silver level ${userSilverLevel} insufficient for gold pack requiring level ${pack.requiredLevel}`);
        return new Response(
          JSON.stringify({ error: `Silver Level ${pack.requiredLevel} required to unlock this pack` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service role for the transaction (to bypass RLS)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Always recalculate price server-side from authoritative pack catalog.
    const { data: orderIds, error: purchaseError } = await supabaseAdmin.rpc("purchase_pack_bulk", {
      p_user_id: user.id,
      p_pack_id: pack.id,
      p_pack_name: pack.name,
      p_pack_category: pack.category,
      p_pack_level: pack.level,
      p_unit_price: effectiveUnitPrice,
      p_daily_earning: effectiveDailyEarning,
      p_max_revenue: effectiveTotalRevenue,
      p_duration_days: effectiveDuration,
      p_quantity: quantity,
    });

    if (purchaseError) {
      console.error("Purchase error:", purchaseError.message);
      return new Response(
        JSON.stringify({ error: purchaseError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Purchase successful! ${quantity} order(s) created`);

    return new Response(
      JSON.stringify({
        success: true,
        order_ids: orderIds,
        quantity,
        total_amount: effectiveUnitPrice * quantity,
        pack_name: pack.name,
        pack_category: pack.category,
        pack_level: pack.level,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
