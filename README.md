<div align="center">
  <h1>JavaTube</h1>
  <p><strong>Platform Video Streaming mirip YouTube</strong></p>
  <p>Dibangun dengan Gaman Framework (Bun) + SQLite</p>
</div>

---

## Fitur

- **Auth** — Register, login, JWT, role-based (user/admin)
- **Video Upload & Streaming** — HLS adaptive bitrate (360p / 720p / 1080p)
- **Like & Dislike** — Toggle reaction dengan count sync
- **Komentar** — Nested comments (reply)
- **Subscribe** — Follow channel + notifikasi
- **Playlist** — CRUD playlist + Watch Later
- **Rekomendasi** — Video terkait + trending
- **Live Streaming** — RTMP to HLS via FFmpeg
- **Email Verification** — Token-based + SMTP
- **Forgot Password** — Reset via email
- **2FA** — TOTP (Google Authenticator, Authy, dll)
- **Creator Analytics** — Views chart, top video, subscriber growth
- **Admin Panel** — Kelola user & video
- **Rate Limiting** — Per-endpoint (API/Auth/Upload)
- **Dark Theme** — UI responsive

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Gaman](https://github.com/7TogkID/gaman) |
| Database | SQLite (bun:sqlite) |
| Auth | JWT ([jose](https://github.com/panva/jose)) + bcrypt |
| Video | FFmpeg (HLS multi-resolusi) |
| Frontend | HTML / CSS / JS + [HLS.js](https://github.com/video-dev/hls.js) |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/digitallenteranusa-bot/javatube.git
cd javatube

# 2. Install dependency
bun install
bun add jose

# 3. Pastikan FFmpeg terinstall
ffmpeg -version

# 4. (Opsional) Buat .env
cp app/.env.example app/.env
# Edit JWT_SECRET, SMTP config, dll

# 5. Jalankan
bun run app/index.ts

# 6. Buka http://localhost:3000
```

## Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `JWT_SECRET` | `gamantube-default-secret-change-me` | **Wajib diganti** untuk production |
| `PORT` | `3000` | Port server |
| `HOST` | `0.0.0.0` | Host binding |
| `APP_URL` | `http://localhost:3000` | URL untuk link di email |
| `SMTP_HOST` | _(kosong)_ | SMTP server (kosong = log ke console) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | _(kosong)_ | SMTP username |
| `SMTP_PASS` | _(kosong)_ | SMTP password |
| `SMTP_FROM` | `noreply@gamantube.local` | Sender email |

## Buat Admin

Setelah register akun, jalankan:

```bash
bun -e "const{Database}=require('bun:sqlite');const db=new Database('app/data/app.db');db.run(\"UPDATE users SET role='admin' WHERE username='USERNAME_KAMU'\")"
```

## Struktur Proyek

```
app/
├── index.ts                  # Entry point
├── database/init.ts          # SQLite schema (10 tabel)
├── controllers/              # 11 controller
├── services/                 # 13 service
├── middleware/                # Auth, admin, rate limit
├── routes/                   # API + static
├── public/                   # 17 halaman HTML + CSS + JS
├── uploads/                  # Runtime (video, thumbnail, HLS, avatar, live)
├── data/                     # SQLite database
└── docs/                     # Dokumentasi + nginx config
```

## Screenshot

> Jalankan server dan buka `http://localhost:3000` untuk melihat tampilan.

## Lisensi

MIT
