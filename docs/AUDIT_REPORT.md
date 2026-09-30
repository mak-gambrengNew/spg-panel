# Audit Report — PWA Gerai React v0.1.0

Tanggal audit: 2026-09-30

## 1. Frontend static audit

PASS — React entry exists.
PASS — manifest and service worker exist.
PASS — IndexedDB pending-sale queue exists.
PASS — no `serverApply` simulation in production source.
PASS — no hardcoded `Gerai 1` in production source.
PASS — no SPG close operation is exposed in the UI.
PASS — login stores the session returned by `spg-login` into Supabase client state.

## 2. Backend cross-check

Checked the current Supabase Edge Functions and RPC definitions:

- `spg-login`
- `gerai-context`
- `gerai-operations`
- `monitoring-ingest-sale`
- `gerai-data`
- `gerai-pay`
- `get_gerai_context`
- `open_store_session`
- `create_store_restock_request`
- `close_store_session`

The frontend calls the existing contracts rather than inventing a new API surface.

## 3. Security/authority checks

- Store is resolved from the URL slug and verified server-side.
- SPG is authenticated by the existing `spg-login` function.
- Business/store boundaries are enforced server-side by the existing context/operation/sales functions.
- Sale price and total are server-derived by `monitoring-ingest-sale`.
- Sale requests carry a client-generated `transaction_id` used by the existing endpoint for idempotency.
- SPG close is not exposed. The existing `close_store_session` function intentionally rejects SPG close with `spg_close_store_disabled_checker_required`.

## 4. Realtime checks

The frontend subscribes to changes for menus, inventory master, store identity/status, store inventory, operation sessions, and monitoring sales, and uses those events to refresh authoritative context.

Realtime is treated as a refresh trigger, not as an authority replacement.

## 5. Offline checks

Offline is limited to caching and pending sale queue. Opening a store requires an online server round trip because it changes the authoritative operation session.

Pending sales are only considered complete after server acknowledgement.

## 6. Verification performed

- `node tests/audit.mjs` → PASS.
- TypeScript parser/typecheck command over the source → PASS.
- Production build was **not executed** because npm package installation is unavailable in this environment (registry/cache unavailable). This is an environment limitation, not a claim that the bundle was built.

## 7. Known integration boundary

Current backend Edge Functions use `stores.slug` as the Gerai URL identifier. `stores.public_token` exists in the database but is not currently consumed by `spg-login`/`gerai-context`. Therefore this repo follows the existing slug contract. If the Owner URL generator is changed to expose `public_token` instead, the backend resolver must be updated before changing the frontend.

## 8. Staging acceptance test required

Before production release, run the real authenticated flow:

1. closed → SPG code → authenticated session;
2. opening form → server session open;
3. sale → monitoring event and daily aggregates;
4. offline sale → reconnect → idempotent sync;
5. Owner menu/price update → Gerai realtime/context refresh;
6. Checker close → Gerai receives closed state and blocks sales.
