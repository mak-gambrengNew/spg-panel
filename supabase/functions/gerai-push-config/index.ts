import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.7";
import { p256 } from "npm:@noble/curves@1.9.7/nist.js";

const url = Deno.env.get("SUPABASE_URL")!;
const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);
const anonKey = keys["default"] ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, idle_timeout: 5 });
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const b64url = (bytes: Uint8Array) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); };

Deno.serve(async req => {
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization"); if (!auth) return json({ error: "unauthorized" }, 401);
  const sb = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const u = await sb.auth.getUser(); if (!u.data.user) return json({ error: "unauthorized" }, 401);
  const p = await sb.from("profiles").select("id,business_id,role,status").eq("id", u.data.user.id).maybeSingle();
  if (!p.data || p.data.status !== "active" || !["owner", "spg"].includes(p.data.role)) return json({ error: "forbidden" }, 403);

  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  if (!privateKey) return json({ error: "vapid_private_key_not_configured" }, 503);
  const rows = await db("select subject from private.push_vapid_config where id=true limit 1");
  const subject = rows[0]?.subject?.trim();
  if (!subject) return json({ error: "push_subject_not_initialized" }, 503);

  let raw: Uint8Array;
  try {
    const normalized = privateKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - privateKey.length % 4) % 4);
    const bin = atob(normalized); raw = Uint8Array.from(bin, c => c.charCodeAt(0));
    if (raw.length !== 32) throw new Error("invalid VAPID private key length");
  } catch (_) { return json({ error: "invalid_vapid_private_key" }, 500); }

  const publicKey = b64url(p256.getPublicKey(raw, false));
  return json({ public_key: publicKey, subject });
});
