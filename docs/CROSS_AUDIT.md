# Cross Audit Checklist

## Source design audit

- [x] `panel_gerai_buka_tutup.html` dipakai sebagai arah UX: opening gate, dashboard operasional, transaksi, history, inventory, sync indicator.
- [x] Hardcoded store identity tidak dipakai.
- [x] Simulated `serverApply()` tidak dipakai.

## Backend audit

- [x] SPG login memakai existing `spg-login`.
- [x] Store context memakai existing `gerai-context`.
- [x] Opening memakai existing server RPC melalui `gerai-operations`.
- [x] Sales memakai existing `monitoring-ingest-sale`.
- [x] Server menghitung ulang harga/total.
- [x] `transaction_id` dipakai sebagai idempotency key.
- [x] SPG close tidak tersedia di UI dan backend sudah menolak close.

## PWA audit

- [x] manifest.
- [x] service worker.
- [x] standalone display.
- [x] offline detection.
- [x] IndexedDB pending queue.
- [x] reconnect retry.
- [x] realtime refresh.

## Data authority audit

- [x] Menu/harga/logistics/inventory berasal dari `gerai-context`.
- [x] Local storage hanya cache/session/queue, bukan source of truth.
- [x] Pending transaction tidak dianggap final sebelum server acknowledgement.

## Known limitation before production

This repository is a frontend repo. A browser build cannot prove the live RLS/realtime behavior of every table without an authenticated browser test. The backend contract was inspected directly, but final staging QA must execute: closed→login→opening, sale, offline sale→reconnect, Owner menu/price update→Gerai refresh, Checker close→Gerai refresh.
