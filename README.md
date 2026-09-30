# PWA Gerai — React + Vite + Supabase

PWA Gerai standalone untuk satu deployment yang melayani banyak Gerai. Identitas Gerai berasal dari URL path (`/:slug`) dan diverifikasi server. SPG tidak ditugaskan ke Gerai; SPG aktif dapat masuk dari link Gerai mana pun dalam business yang sama.

## Prinsip utama

1. Server adalah sumber kebenaran untuk identitas, status Gerai, menu, harga, logistik, inventory, session, dan transaksi.
2. Frontend hanya merender state server dan mengirim input/command.
3. Gerai hanya dapat dibuka oleh SPG melalui `open_store_session`.
4. SPG tidak memiliki jalur penutupan; backend saat ini sengaja menolak `close_store_session` dengan `spg_close_store_disabled_checker_required`.
5. Penjualan divalidasi ulang server oleh `monitoring-ingest-sale`; harga dan total dihitung dari menu server.
6. Offline queue hanya untuk transaksi penjualan yang sudah dibuat secara lokal; transaksi tidak dianggap final sampai server menerima.
7. Realtime dipakai sebagai pemicu refresh context, bukan sebagai sumber kebenaran tunggal.

## Jalankan

```bash
cp .env.example .env.local
npm install
npm run dev
```

Build production:

```bash
npm run typecheck
npm run audit
npm run build
```

## URL Gerai

Satu deployment melayani banyak Gerai:

```text
https://gerai.domain.tld/<slug-gerai>
```

Backend saat ini menggunakan `stores.slug` pada `gerai-context` dan `spg-login`. Jika Owner nantinya memutuskan URL publik harus memakai `public_token` alih-alih `slug`, kontrak backend perlu diubah bersama; jangan mengubah frontend saja.

## Kontrak backend yang dipakai

- `spg-login`
- `gerai-context`
- `gerai-operations`
- `monitoring-ingest-sale`
- `gerai-data`
- `gerai-pay`

RPC server yang menjadi authority:

- `get_gerai_context`
- `open_store_session`
- `create_store_restock_request`
- `send_store_restock`
- `receive_store_restock`
- `create_ice_order`
- `receive_ice`
- `create_emergency_request`
- `create_store_payment`

## Design direction

UI mengambil arah visual dan alur dari `panel_gerai_buka_tutup.html`: kartu operasional besar, status Gerai yang jelas, flow buka Gerai, menu transaksi yang cepat disentuh, indikator sync, dan mobile-first. Data hardcode dari prototype tidak dibawa ke production.

### Install behavior

Because one deployment serves many store slugs, the PWA remembers the last verified slug locally. The generic manifest starts at `/?installed=1`; the app resolves the remembered slug and refreshes server context. If the device has no remembered slug, the user must open the store link again. This avoids inventing a store identity at install time.


## Brand assets

Official brand assets supplied for this PWA are stored in `public/assets/`:

- `brand-logo-transparent.png` — primary logo, background removed; use for PWA splash, header, login and brand surfaces that need transparent artwork.
- `brand-logo-background.png` — supplied logo with background; use only where a contained/background brand treatment is appropriate.
- `icon-192.png` and `icon-512.png` — generated PWA icon sizes derived from the transparent brand asset.

Do not replace these with text placeholders in production.

## Vercel update behavior

`index.html` and `sw.js` are sent with no-cache headers. The service worker is registered with `updateViaCache: none`, checks for updates when the app becomes visible, and promotes a waiting worker immediately. A new Vercel deployment therefore becomes visible after the update cycle without requiring the user to manually clear site data.

## Push notifications

The Gerai frontend uses `VITE_VAPID_PUBLIC_KEY` for browser subscription and registers the browser subscription through the existing authenticated `chat-register-push` function. The browser never receives or stores the VAPID private key. Push delivery must remain server-side using the existing `push_subscriptions` and `user_notifications` infrastructure. The production Supabase sender must read `VAPID_PRIVATE_KEY` from Edge Function Secrets; never commit it to this repository.

### Production environment

Set these Vercel environment variables for Production (the public key is not a secret):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
```

Set this Supabase Edge Function Secret: `VAPID_PRIVATE_KEY`. The public and private keys must come from the same VAPID pair. Do not put `VAPID_PRIVATE_KEY` in Vercel `VITE_*` variables, GitHub, or source code. Supabase makes production Edge Function secrets available to deployed functions without a redeploy after the secret is saved.

The existing backend also needs the current `chat-register-push`, `push_subscriptions`, `user_notifications`, and push-delivery infrastructure. This frontend package does not replace those production database/Edge Function contracts.
