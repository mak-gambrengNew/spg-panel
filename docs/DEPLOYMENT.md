# Production Deployment — PWA Gerai

## 1. Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables → Production**:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
```

`VITE_VAPID_PUBLIC_KEY` must be the public key from the **same VAPID pair** whose private key is stored in Supabase. The public key is intentionally client-visible; never put the private key in a `VITE_*` variable.

## 2. Supabase secret

In **Supabase → Edge Functions → Secrets**, keep exactly the VAPID private credential as:

```text
VAPID_PRIVATE_KEY=<your VAPID private key>
```

Do not commit it to GitHub, Vercel, or this repository.

## 3. Existing production backend contract

The frontend expects these already-deployed backend capabilities in the shared Supabase project:

- `spg-login`
- `gerai-context`
- `gerai-operations`
- `gerai-data`
- `monitoring-ingest-sale`
- `chat-register-push`
- the existing notification/push delivery infrastructure (`push_subscriptions`, `user_notifications`, and the server-side sender/queue)

The frontend does **not** call an undeployed `gerai-push-config` function. The browser receives the VAPID public key from `VITE_VAPID_PUBLIC_KEY` and registers the subscription through `chat-register-push`.

The server-side push sender must use the VAPID private key from Supabase Edge Function Secrets. If the currently deployed sender still reads a private key from `private.push_vapid_config` instead of `VAPID_PRIVATE_KEY`, update that sender before enabling production push. The secret itself does not need a redeploy after being saved; Supabase makes production secrets available to functions immediately.

## 4. Build verification

Run locally or in CI:

```bash
npm ci
npm run typecheck
npm run audit
npm run build
```

The current repository has passed `typecheck` and the static audit. A local production build requires dependencies to be installed; the build was not executed in this environment because the npm registry was unavailable during dependency installation.

## 5. Vercel deployment

Import the GitHub repository into Vercel and use the standard Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

The included `vercel.json` rewrites all application routes to `index.html` and prevents aggressive caching of `index.html` and `sw.js`.

After a GitHub push, Vercel automatically creates/deploys the corresponding production build when the connected production branch is configured.

## 6. PWA update behavior

The service worker uses a versioned cache, `updateViaCache: none`, network-first navigation, and immediate activation of waiting workers. A new deployment is therefore picked up during the browser's update cycle without asking users to clear site data.

“Instant” means best-effort browser/service-worker update behavior; a browser can still defer an update until its next eligible navigation/visibility check.

## 7. Production smoke test

After deployment:

1. Open `https://<domain>/<store-slug>`.
2. Confirm the Gerai identity comes from backend context.
3. Log in with an active SPG code.
4. Open the Gerai using the opening flow.
5. Confirm menus and inventory come from the backend.
6. Make one test sale and verify it reaches Monitoring.
7. Turn off network and create a test transaction; confirm it enters the pending queue.
8. Restore network and confirm the queued transaction syncs once.
9. Tap **Aktifkan notifikasi** and allow browser notifications.
10. Confirm a row appears/updates in `push_subscriptions`.
11. Trigger a real notification from the server-side notification path and verify the Android notification opens the Gerai URL.
12. Revoke/disable the Gerai or SPG and confirm the backend rejects further operational requests.

## Production Push prerequisites

1. Supabase Edge Function Secret: `VAPID_PRIVATE_KEY` (never commit this value).
2. `private.push_vapid_config` must contain the matching `public_key` and `subject` for that private key.
3. Deploy `supabase/functions/send-web-push` and `supabase/functions/gerai-push-config`.
4. Vercel only needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_VAPID_PUBLIC_KEY` may be used as a fallback.
5. Test: SPG logs in → Gerai → Aktifkan notifikasi → subscription is stored in `push_subscriptions` → a notification creates a delivery through `send-web-push`.
