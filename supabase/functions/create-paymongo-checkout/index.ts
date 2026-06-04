import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const planPrices: Record<string, number> = {
  "Starter Plan": 149,
  "Pro Unlimited Plan": 249,
  "Business Unlimited": 449
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function getPlanCanonicalName(planName: unknown) {
  const key = String(planName || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (key.includes("business")) return "Business Unlimited";
  if (key.includes("pro")) return "Pro Unlimited Plan";
  if (key.includes("starter")) return "Starter Plan";
  return "Standard Free Plan";
}

function getBasicAuth(secretKey: string) {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

function buildReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `VALORA-${stamp}-${random}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
  const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  const siteUrl = (Deno.env.get("SITE_URL") || "https://valora-m.vercel.app").replace(/\/$/, "");

  if (!supabaseUrl || !serviceRoleKey || !paymongoSecretKey) {
    return jsonResponse({ error: "Checkout function is not configured." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userToken = authHeader.replace("Bearer ", "").trim();
  if (!userToken) {
    return jsonResponse({ error: "Please sign in before subscribing." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: authData, error: authError } = await admin.auth.getUser(userToken);
  const user = authData?.user;
  if (authError || !user?.id || !user.email) {
    return jsonResponse({ error: "Invalid or expired session." }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const plan = getPlanCanonicalName(body?.plan);
  const billingCycle = String(body?.billing_cycle || "monthly").toLowerCase() === "yearly" ? "yearly" : "monthly";

  if (!planPrices[plan]) {
    return jsonResponse({ error: "Select a paid Valora EM plan." }, 400);
  }

  if (billingCycle !== "monthly") {
    return jsonResponse({ error: "Yearly checkout is not active yet. Please choose Monthly billing." }, 400);
  }

  const amount = planPrices[plan];
  const amountInCentavos = Math.round(amount * 100);
  const reference = buildReference();
  const checkoutDescription = `Valora EM ${plan} - 1 Month`;

  const { data: order, error: orderError } = await admin
    .from("payment_orders")
    .insert({
      user_id: user.id,
      customer_email: user.email,
      plan,
      billing_cycle: billingCycle,
      amount,
      currency: "PHP",
      status: "pending",
      paymongo_reference_number: reference
    })
    .select("id")
    .single();

  if (orderError || !order?.id) {
    return jsonResponse({ error: orderError?.message || "Could not prepare checkout order." }, 500);
  }

  const checkoutPayload = {
    data: {
      attributes: {
        line_items: [
          {
            name: checkoutDescription,
            amount: amountInCentavos,
            currency: "PHP",
            quantity: 1
          }
        ],
        payment_method_types: ["card", "gcash", "qrph"],
        success_url: `${siteUrl}/app?payment=success&reference=${encodeURIComponent(reference)}`,
        cancel_url: `${siteUrl}/app?payment=cancelled&reference=${encodeURIComponent(reference)}`,
        reference_number: reference,
        send_email_receipt: true,
        metadata: {
          user_id: user.id,
          customer_email: user.email,
          plan,
          billing_cycle: billingCycle,
          order_id: order.id
        }
      }
    }
  };

  const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": getBasicAuth(paymongoSecretKey),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(checkoutPayload)
  });

  const paymongoJson = await paymongoResponse.json().catch(() => ({}));
  if (!paymongoResponse.ok) {
    await admin
      .from("payment_orders")
      .update({
        status: "checkout_failed",
        raw_checkout_response: paymongoJson,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    const message = paymongoJson?.errors?.[0]?.detail || paymongoJson?.errors?.[0]?.title || "PayMongo checkout could not be created.";
    return jsonResponse({ error: message, details: paymongoJson }, 502);
  }

  const checkoutSession = paymongoJson?.data;
  const checkoutSessionId = checkoutSession?.id;
  const checkoutUrl = checkoutSession?.attributes?.checkout_url || checkoutSession?.attributes?.url;

  if (!checkoutUrl) {
    await admin
      .from("payment_orders")
      .update({
        status: "checkout_missing_url",
        paymongo_checkout_session_id: checkoutSessionId || null,
        raw_checkout_response: paymongoJson,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    return jsonResponse({ error: "PayMongo did not return a checkout URL." }, 502);
  }

  await admin
    .from("payment_orders")
    .update({
      paymongo_checkout_session_id: checkoutSessionId,
      checkout_url: checkoutUrl,
      raw_checkout_response: paymongoJson,
      updated_at: new Date().toISOString()
    })
    .eq("id", order.id);

  return jsonResponse({
    ok: true,
    checkout_url: checkoutUrl,
    reference_number: reference,
    order_id: order.id
  });
});
