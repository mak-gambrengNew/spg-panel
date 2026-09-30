# Pedoman Desain PWA Gerai

## Arah visual

- Mobile-first; target utama layar ponsel SPG.
- Hierarki visual tegas: status Gerai → aksi utama → operasi hari ini → detail.
- Gunakan kartu dengan radius sedang, ruang napas cukup, dan tombol sentuh minimal 44px.
- Warna brand boleh diturunkan dari prototype, tetapi jangan mengandalkan warna saja untuk status.
- Status selalu memiliki teks + ikon/shape.
- Hindari dashboard yang terlalu padat; transaksi harus bisa dilakukan dengan satu tangan.

## State wajib

`BOOTING → CLOSED → ACCESS → OPENING → OPEN`

Error/session expiry dapat membawa UI kembali ke `CLOSED` atau `ACCESS` sesuai kondisi server.

Tidak ada state frontend yang boleh mengklaim `OPEN` hanya karena tombol ditekan. State `OPEN` berasal dari respons server/context.

## Offline

- Banner koneksi selalu terlihat ketika offline.
- Transaksi pending diberi label `Menunggu sinkronisasi`.
- Pending tidak boleh disebut `berhasil` sebelum server menerima.
- Opening Gerai tidak dilakukan offline karena membuka session adalah perubahan authority server.
- Realtime/reconnect memicu refresh context.

## Dynamic data

Semua nama Gerai, menu, harga, status menu, logistik, stok, saldo, dan session berasal dari backend.

## Accessibility

- Label form eksplisit.
- Fokus keyboard terlihat.
- `aria-live` untuk toast/status sync.
- Jangan gunakan placeholder sebagai satu-satunya label.
- Jangan mengandalkan warna untuk membedakan state.
