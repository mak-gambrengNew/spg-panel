# Backend Contract Audit — PWA Gerai

Diverifikasi terhadap Supabase project yang digunakan proyek ini sebelum repo dibuat.

## Existing Edge Functions

- `spg-login` — login SPG menggunakan access code; menerima `slug` untuk memvalidasi Gerai aktif dan business yang sama.
- `gerai-context` — memanggil `get_gerai_context(p_user_id, p_slug)` dan mengembalikan business, user, store, session, cash, menus, logistics, inventory, capabilities.
- `gerai-open` — tersedia tetapi repo ini menggunakan `gerai-operations` action `open` agar satu gateway operasi dipakai.
- `gerai-operations` — open, close (backend sengaja ditolak untuk SPG), restock request/send/receive, ice order/receive, emergency, checker inspection.
- `monitoring-ingest-sale` — POST/PATCH/DELETE transaksi, memvalidasi SPG, Gerai aktif, session open, menu aktif, harga server, total server, dan idempotency transaction_id.
- `gerai-data` — history dan chat operations.
- `gerai-pay` — pembayaran operasional.

## Important security finding

`get_gerai_context` mengembalikan `capabilities.close` berdasarkan session open. Namun `close_store_session` saat ini selalu melempar `spg_close_store_disabled_checker_required`. Karena requirement bisnis menetapkan SPG tidak boleh menutup, frontend sengaja **tidak menampilkan close action** dan tidak memanggil close untuk SPG. Penutupan harus datang dari PWA Checker.

## Important integration constraint

Backend saat ini memakai `slug` sebagai identifier URL pada `gerai-context` dan `spg-login`. Tabel `stores` juga memiliki `public_token`, tetapi Edge Function yang diaudit belum menggunakan token itu. Repo ini tidak mengarang kontrak baru. Jika Owner menghasilkan URL berbasis token, backend harus menyediakan resolver token→store/slug sebelum frontend diubah.
