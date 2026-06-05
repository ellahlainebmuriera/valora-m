import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-valora-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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

function getSubscriptionExpiry(months = 1) {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  return expiry.toISOString();
}

function getPaymentAmount(payment: Record<string, unknown>) {
  const attributes = payment?.attributes as Record<string, unknown> | undefined;
  return Number(attributes?.amount || 0);
}

function getPaymentStatus(payment: Record<string, unknown>) {
  const attributes = payment?.attributes as Record<string, unknown> | undefined;
  return String(attributes?.status || "").toLowerCase();
}

function getPayMongoEvent(payload: Record<string, unknown>) {
  const data = payload?.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;

  return {
    eventType: String(attributes?.type || data?.type || payload?.type || ""),
    checkoutSession: (attributes?.data || (data as Record<string, unknown>)?.data || data) as Record<string, unknown> | undefined
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const configuredWebhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  if (!configuredWebhookSecret) {
    return jsonResponse({ error: "Webhook function is not configured." }, 500);
  }

  const url = new URL(req.url);
  const providedSecret =
    url.searchParams.get("token") ||
    req.headers.get("x-valora-webhook-secret") ||
    "";

  if (providedSecret !== configuredWebhookSecret) {
    return jsonResponse({ error: "Invalid webhook secret." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Webhook function is not configured." }, 500);
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const { eventType, checkoutSession } = getPayMongoEvent(payload);
  if (eventType !== "checkout_session.payment.paid") {
    return jsonResponse({ ok: true, ignored: true, event_type: eventType || "unknown" });
  }

  const checkoutSessionId = checkoutSession?.id;
  const attributes = (checkoutSession?.attributes as Record<string, unknown> | undefined) || {};
  const reference = attributes.reference_number;
  const payments = Array.isArray(attributes.payments)
    ? attributes.payments as Record<string, unknown>[]
    : [];
  const paidPayment = payments.find((payment: Record<string, unknown>) => getPaymentStatus(payment) === "paid") || payments[0];

  if (!reference || !checkoutSessionId || !paidPayment) {
    return jsonResponse({ error: "Missing checkout reference, session, or payment details." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: order, error: orderError } = await admin
    .from("payment_orders")
    .select("*")
    .eq("paymongo_reference_number", reference)
    .maybeSingle();

  if (orderError) {
    return jsonResponse({ error: orderError.message }, 500);
  }

  if (!order) {
    return jsonResponse({ ok: true, ignored: true, reason: "No matching Valora EM order." });
  }

  if (order.status === "paid") {
    return jsonResponse({ ok: true, duplicate: true });
  }

  if (order.paymongo_checkout_session_id && order.paymongo_checkout_session_id !== checkoutSessionId) {
    await admin
      .from("payment_orders")
      .update({
        status: "session_mismatch",
        raw_webhook_event: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    return jsonResponse({ error: "Checkout session mismatch." }, 400);
  }

  const paidAmountCentavos = getPaymentAmount(paidPayment);
  const expectedAmountCentavos = Math.round(Number(order.amount || 0) * 100);
  if (paidAmountCentavos < expectedAmountCentavos) {
    await admin
      .from("payment_orders")
      .update({
        status: "amount_mismatch",
        raw_webhook_event: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    return jsonResponse({ error: "Paid amount does not match the order amount." }, 400);
  }

  const paymentAttributes = paidPayment.attributes as Record<string, unknown> | undefined;
  const paymentId = String(paidPayment.id || "");
  const paymentIntent = attributes.payment_intent as Record<string, unknown> | undefined;
  const paymentIntentId = String(paymentIntent?.id || attributes.payment_intent_id || "");
  const source = paymentAttributes?.source as Record<string, unknown> | undefined;
  const sourceType = String(source?.type || "");
  const expiresAt = getSubscriptionExpiry(1);
  const now = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      is_pro: true,
      plan: order.plan,
      billing_cycle: order.billing_cycle || "monthly",
      auto_renewal_enabled: false,
      billing_status: "paid_via_paymongo",
      subscription_expires_at: expiresAt,
      updated_at: now
    })
    .eq("id", order.user_id);

  if (profileError) {
    await admin
      .from("payment_orders")
      .update({
        status: "profile_update_failed",
        raw_webhook_event: payload,
        updated_at: now
      })
      .eq("id", order.id);

    return jsonResponse({ error: profileError.message }, 500);
  }

  await admin
    .from("payment_orders")
    .update({
      status: "paid",
      paymongo_checkout_session_id: checkoutSessionId,
      paymongo_payment_id: paymentId || null,
      paymongo_payment_intent_id: paymentIntentId || null,
      paymongo_source_type: sourceType || null,
      raw_webhook_event: payload,
      paid_at: now,
      expires_at: expiresAt,
      updated_at: now
    })
    .eq("id", order.id);

  const paymentPayload = {
    user_id: order.user_id,
    customer_email: order.customer_email,
    plan: order.plan,
    method: `PayMongo automatic checkout${sourceType ? ` (${sourceType})` : ""}`,
    amount: Number(order.amount || 0),
    status: "paid",
    billing_mode: "Manual Renewal",
    auto_renewal_enabled: false,
    paymongo_reference_number: reference,
    paymongo_checkout_session_id: checkoutSessionId,
    paymongo_payment_id: paymentId || null
  };

  const existingPayment = await admin
    .from("app_payments")
    .select("id")
    .eq("paymongo_reference_number", reference)
    .maybeSingle();

  if (!existingPayment.data) {
    await admin.from("app_payments").insert(paymentPayload);
  }

  return jsonResponse({
    ok: true,
    activated: true,
    plan: order.plan,
    customer_email: order.customer_email,
    expires_at: expiresAt
  });
});
