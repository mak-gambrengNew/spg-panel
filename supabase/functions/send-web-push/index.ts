import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.7";
import webpush from "npm:web-push@3.6.7";

const url = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
const serviceKey = secretKeys["default"] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, idle_timeout: 5, connect_timeout: 5 });
const supabase = createClient(url, serviceKey);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const internal = await db`select internal_token from private.push_internal_config where id=true limit 1`;
  if (!internal.length || req.headers.get("x-push-internal-token") !== internal[0].internal_token) {
    return json({ error: "unauthorized" }, 401);
  }

  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  if (!privateKey) return json({ error: "vapid_private_key_not_configured" }, 503);

  // Public key + subject are non-secret configuration. Keep the public key in the
  // existing private config row so it can be changed without shipping frontend code.
  const vapidRows = await db`select public_key, subject from private.push_vapid_config where id=true limit 1`;
  const publicKey = vapidRows[0]?.public_key?.trim();
  const subject = vapidRows[0]?.subject?.trim();
  if (!publicKey || !subject) return json({ error: "push_public_config_not_initialized" }, 503);

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const body = await req.json().catch(() => ({}));
  const notificationId = body?.notification_id;
  if (!notificationId) return json({ error: "notification_id_required" }, 400);

  const { data: n, error: ne } = await supabase
    .from("user_notifications")
    .select("id,business_id,recipient_user_id,title,body,type,entity_type,entity_id")
    .eq("id", notificationId)
    .maybeSingle();
  if (ne) return json({ error: ne.message }, 500);
  if (!n) return json({ error: "notification_not_found" }, 404);

  const { data: subs, error: se } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth_key")
    .eq("user_id", n.recipient_user_id)
    .eq("business_id", n.business_id)
    .eq("enabled", true);
  if (se) return json({ error: se.message }, 500);

  const payload = JSON.stringify({
    title: n.title,
    body: n.body,
    notification_id: n.id,
    type: n.type,
    entity_type: n.entity_type,
    entity_id: n.entity_id,
    url: "/",
  });

  let sent = 0, expired = 0, failed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload,
        { TTL: 86400 },
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        expired++;
        await supabase.from("push_subscriptions").update({ enabled: false, updated_at: new Date().toISOString() }).eq("id", s.id);
      } else {
        failed++;
      }
    }
  }

  await db`
    update private.push_delivery_queue
    set status=${sent > 0 || failed === 0 ? "sent" : "failed"},
        last_error=${sent > 0 || failed === 0 ? null : "All push deliveries failed"},
        next_attempt_at=${sent > 0 || failed === 0 ? null : new Date(Date.now() + 60_000)},
        updated_at=now()
    where notification_id=${n.id}
  `;

  return json({ ok: true, notification_id: n.id, attempted: (subs ?? []).length, sent, expired, failed });
});
