# GamanTube - Catatan Proyek

Website video streaming mirip YouTube, dibangun dengan Gaman Framework (Bun).

---

## Status Proyek

### SUDAH DIBUAT

**Core**
- [x] Database SQLite (users, videos, comments, subscriptions, notifications, likes, playlists, playlist_items, email_tokens, view_logs)
- [x] Entry Point (app/index.ts) dengan env config (PORT, HOST)
- [x] File .env.example sebagai template konfigurasi

**Auth**
- [x] Auth Service (register, login, JWT dengan jose, role-based)
- [x] Auth Middleware (verifikasi JWT)
- [x] Auth Controller (register, login, me, email verification, forgot/reset password, 2FA)
- [x] JWT secret dari environment variable

**Video**
- [x] Video Service (upload, CRUD, edit, delete, search)
- [x] Video Controller (upload, list, show, search, update, destroy, view count)
- [x] FFmpeg transcode multi-resolusi (360p, 720p, 1080p) + master playlist
- [x] HLS adaptive bitrate streaming
- [x] Thumbnail auto-generate dari FFmpeg
- [x] Edit & hapus video (dengan cleanup file)

**Like & Dislike**
- [x] Like Service (like/dislike toggle, count sync ke videos)
- [x] Like Controller (like, dislike, remove, status)
- [x] Like/dislike buttons di halaman watch

**Komentar**
- [x] Comment Service (CRUD + nested replies via parent_id)
- [x] Comment Controller (list, create, delete, replies)
- [x] Komentar di halaman watch
- [x] Reply komentar (nested comments)

**Subscribe**
- [x] Subscription Service (subscribe, unsubscribe, status, count)
- [x] Subscription Controller
- [x] Subscribe/unsubscribe button di watch & channel page

**Playlist**
- [x] Playlist Service (CRUD, items, Watch Later auto-create)
- [x] Playlist Controller (create, list, show, update, delete, add/remove items)
- [x] Halaman playlist
- [x] Watch Later button di halaman watch

**Notifikasi**
- [x] Notification Service (new video, comment, subscribe)
- [x] Notification Controller (list, unread count, mark read)
- [x] Halaman notifikasi
- [x] Badge notifikasi di navbar

**User & Channel**
- [x] User Service (profile, update, avatar, admin CRUD)
- [x] User Controller (profile, update profile, update avatar, channel)
- [x] Halaman edit profil (nama tampilan, bio, avatar)
- [x] Halaman channel publik (video grid, subscriber count)

**Live Streaming**
- [x] Live Service (stream key, FFmpeg RTMP→HLS, active streams)
- [x] Live Controller (get/generate stream key, start/stop stream, list active)
- [x] Halaman live streaming (daftar live + go live)

**Email**
- [x] Email Service (token-based, SMTP sending, console fallback)
- [x] Email verification (register → verify email → verified)
- [x] Forgot/reset password via email token
- [x] Halaman verify-email, forgot-password, reset-password

**2FA Authentication**
- [x] TOTP Service (generate secret, verify code, enable/disable)
- [x] 2FA endpoints (setup, enable, disable, status)
- [x] Halaman setup 2FA dengan QR code
- [x] Login flow support 2FA

**Video Recommendations**
- [x] Recommendation Service (same uploader + popular, trending)
- [x] Recommendations sidebar di halaman watch
- [x] API endpoint /api/trending

**Creator Analytics**
- [x] Analytics Service (creator stats, views over time, top videos, subscriber growth)
- [x] Analytics Controller (dashboard, views, top videos, recent stats, subscribers)
- [x] Halaman analytics dengan chart dan tabel

**Admin**
- [x] Admin Middleware (role check)
- [x] Admin Controller (dashboard stats, manage users, manage videos)
- [x] Admin Panel (stats, user list, video list, set role, delete)

**Security & Performance**
- [x] Rate Limiting middleware (API: 60/min, Auth: 10/min, Upload: 5/min)
- [x] Path traversal protection di static routes
- [x] HTTPS setup guide (Nginx + Let's Encrypt)

**Frontend**
- [x] Halaman Homepage (video grid, infinite scroll)
- [x] Halaman Login (+ 2FA support + forgot password link)
- [x] Halaman Register
- [x] Halaman Upload (drag & drop, progress bar + speed)
- [x] Halaman Watch (HLS player, quality selector, like/dislike, komentar + reply, subscribe, recommendations)
- [x] Halaman Search (pencarian video)
- [x] Halaman Channel (profil publik + video)
- [x] Halaman Edit Profil (+ link ke 2FA, analytics, playlist, live)
- [x] Halaman Notifikasi
- [x] Halaman Admin Panel
- [x] Halaman Playlist
- [x] Halaman Live Streaming
- [x] Halaman Analytics (creator dashboard)
- [x] Halaman Setup 2FA
- [x] Halaman Verify Email
- [x] Halaman Forgot Password
- [x] Halaman Reset Password
- [x] CSS Dark Theme
- [x] JavaScript Utilities (token, fetch, format, navbar, notif badge)
- [x] Search bar di navbar

### BELUM DILAKUKAN

- [ ] Install dependency: `bun add jose`
- [ ] Install FFmpeg di sistem
- [ ] Buat file `.env` dari `.env.example`
- [ ] Test semua fitur
- [ ] Buat user admin pertama (manual via SQLite)

---

## Struktur File

```
app/
├── index.ts                        # Entry point
├── .env.example                    # Template environment variables
├── database/
│   └── init.ts                     # SQLite schema (10 tabel)
├── controllers/
│   ├── auth.controller.ts          # Register, login, me, verify email, reset pw, 2FA
│   ├── video.controller.ts         # Upload, list, search, show, update, delete
│   ├── comment.controller.ts       # List, create, delete, replies
│   ├── subscription.controller.ts  # Subscribe, unsubscribe, status
│   ├── notification.controller.ts  # List, unread count, mark read
│   ├── user.controller.ts          # Profile, update, avatar, channel
│   ├── admin.controller.ts         # Dashboard, manage users & videos
│   ├── like.controller.ts          # Like, dislike, status
│   ├── playlist.controller.ts      # CRUD playlist, items, watch later
│   ├── live.controller.ts          # Stream key, start/stop, active streams
│   └── analytics.controller.ts     # Creator analytics dashboard
├── services/
│   ├── auth.service.ts             # Auth logic + JWT
│   ├── video.service.ts            # Video CRUD + FFmpeg multi-resolusi
│   ├── comment.service.ts          # Comment CRUD + nested replies
│   ├── subscription.service.ts     # Subscription logic
│   ├── notification.service.ts     # Notification CRUD + triggers
│   ├── user.service.ts             # User profile + admin operations
│   ├── like.service.ts             # Like/dislike toggle + count sync
│   ├── playlist.service.ts         # Playlist CRUD + Watch Later
│   ├── live.service.ts             # Live streaming (FFmpeg RTMP→HLS)
│   ├── analytics.service.ts        # Creator stats, views, top videos
│   ├── email.service.ts            # Email tokens + SMTP sending
│   ├── recommendation.service.ts   # Video recommendations + trending
│   └── totp.service.ts             # 2FA TOTP (RFC 6238)
├── middleware/
│   ├── auth.middleware.ts           # JWT verification
│   ├── admin.middleware.ts          # Admin role check
│   └── ratelimit.middleware.ts      # Rate limiting (configurable)
├── routes/
│   ├── api.routes.ts               # Semua API endpoints
│   └── static.routes.ts            # Serve HTML/CSS/JS + SPA routes
├── public/
│   ├── index.html                  # Homepage (infinite scroll)
│   ├── login.html                  # Login (+ 2FA)
│   ├── register.html               # Register
│   ├── upload.html                 # Upload video (progress bar)
│   ├── watch.html                  # Video player + like + komentar + subscribe + recommendations
│   ├── search.html                 # Pencarian video
│   ├── channel.html                # Channel publik
│   ├── profile.html                # Edit profil
│   ├── notifications.html          # Notifikasi
│   ├── admin.html                  # Admin panel
│   ├── playlist.html               # Playlist management
│   ├── live.html                   # Live streaming
│   ├── analytics.html              # Creator analytics
│   ├── setup-2fa.html              # Pengaturan 2FA
│   ├── verify-email.html           # Verifikasi email
│   ├── forgot-password.html        # Lupa password
│   ├── reset-password.html         # Reset password
│   ├── css/style.css               # Dark theme
│   └── js/app.js                   # JS utilities + navbar + notif
├── uploads/                        # (auto-created)
│   ├── videos/                     # File video asli
│   ├── thumbnails/                 # Thumbnail
│   ├── hls/                        # HLS multi-resolusi
│   ├── avatars/                    # Avatar user
│   └── live/                       # Live stream HLS
├── data/
│   └── app.db                      # SQLite database
└── docs/
    ├── CATATAN-PROYEK.md           # File ini
    ├── SETUP-HTTPS.md              # Panduan HTTPS
    └── nginx.conf                  # Config Nginx
```

---

## API Endpoints

### Auth
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| POST | /api/auth/register | - | Daftar akun (rate limited, kirim email verifikasi) |
| POST | /api/auth/login | - | Login (rate limited, support 2FA) |
| GET | /api/auth/me | Ya | Data user saat ini |
| POST | /api/auth/verify-email | - | Verifikasi email via token |
| POST | /api/auth/resend-verification | Ya | Kirim ulang email verifikasi |
| POST | /api/auth/forgot-password | - | Minta reset password (rate limited) |
| POST | /api/auth/reset-password | - | Reset password via token |
| GET | /api/auth/2fa/status | Ya | Status 2FA |
| POST | /api/auth/2fa/setup | Ya | Generate secret + QR |
| POST | /api/auth/2fa/enable | Ya | Aktifkan 2FA |
| POST | /api/auth/2fa/disable | Ya | Nonaktifkan 2FA |

### Video
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/videos?page=&limit= | - | Daftar video (pagination) |
| GET | /api/videos/search?q=&page= | - | Cari video |
| GET | /api/videos/:id | - | Detail video |
| POST | /api/videos | Ya | Upload video (rate limited) |
| PUT | /api/videos/:id | Ya | Edit judul & deskripsi |
| DELETE | /api/videos/:id | Ya | Hapus video + file |
| POST | /api/videos/:id/view | - | Tambah view count + analytics |
| GET | /api/my-videos | Ya | Video milik user |

### Like & Dislike
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| POST | /api/videos/:videoId/like | Ya | Like (toggle) |
| POST | /api/videos/:videoId/dislike | Ya | Dislike (toggle) |
| DELETE | /api/videos/:videoId/like | Ya | Hapus reaction |
| GET | /api/videos/:videoId/like-status | - | Status like/dislike |

### Recommendations
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/videos/:videoId/recommendations | - | Video rekomendasi |
| GET | /api/trending | - | Video trending (7 hari) |

### Komentar
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/videos/:videoId/comments | - | Daftar komentar (top-level) |
| POST | /api/videos/:videoId/comments | Ya | Tulis komentar (+ parentId untuk reply) |
| GET | /api/comments/:commentId/replies | - | Daftar reply |
| DELETE | /api/comments/:id | Ya | Hapus komentar |

### Subscribe
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| POST | /api/subscribe/:channelId | Ya | Subscribe |
| DELETE | /api/subscribe/:channelId | Ya | Unsubscribe |
| GET | /api/subscribe/:channelId/status | Ya | Cek status subscribe |
| GET | /api/my-subscriptions | Ya | Daftar channel yang disubscribe |

### Notifikasi
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/notifications | Ya | Daftar notifikasi |
| GET | /api/notifications/unread-count | Ya | Jumlah belum dibaca |
| POST | /api/notifications/:id/read | Ya | Tandai dibaca |
| POST | /api/notifications/read-all | Ya | Tandai semua dibaca |

### User & Channel
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/profile | Ya | Data profil sendiri |
| PUT | /api/profile | Ya | Update nama & bio |
| POST | /api/profile/avatar | Ya | Upload avatar |
| GET | /api/channel/:username | - | Data channel publik |

### Playlist
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/playlists | Ya | Daftar playlist sendiri |
| POST | /api/playlists | Ya | Buat playlist |
| GET | /api/playlists/watch-later | Ya | Watch Later playlist |
| POST | /api/playlists/watch-later | Ya | Tambah ke Watch Later |
| GET | /api/playlists/:id | - | Detail playlist + items |
| PUT | /api/playlists/:id | Ya | Update playlist |
| DELETE | /api/playlists/:id | Ya | Hapus playlist |
| POST | /api/playlists/:id/items | Ya | Tambah video ke playlist |
| DELETE | /api/playlists/:id/items/:videoId | Ya | Hapus video dari playlist |
| GET | /api/users/:userId/playlists | - | Playlist publik user |

### Live Streaming
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/live/streams | - | Daftar live stream aktif |
| GET | /api/live/stream-key | Ya | Lihat stream key |
| POST | /api/live/stream-key | Ya | Generate stream key baru |
| POST | /api/live/start | Ya | Mulai live stream |
| POST | /api/live/:videoId/stop | Ya | Hentikan live stream |

### Analytics
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/analytics/dashboard | Ya | Statistik creator |
| GET | /api/analytics/views?days= | Ya | Views per hari |
| GET | /api/analytics/top-videos?limit= | Ya | Top video by views |
| GET | /api/analytics/recent | Ya | Performa video minggu ini |
| GET | /api/analytics/subscribers?days= | Ya | Pertumbuhan subscriber |

### Admin
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | /api/admin/dashboard | Admin | Statistik |
| GET | /api/admin/users | Admin | Daftar user |
| GET | /api/admin/videos | Admin | Daftar video |
| PUT | /api/admin/users/:userId/role | Admin | Ubah role |
| DELETE | /api/admin/users/:userId | Admin | Hapus user |
| DELETE | /api/admin/videos/:id | Admin | Hapus video |

### Streaming & Media
| Method | Path | Keterangan |
|--------|------|------------|
| GET | /stream/:videoId/master.m3u8 | HLS master playlist |
| GET | /stream/:videoId/:res/playlist.m3u8 | HLS resolusi playlist |
| GET | /stream/:videoId/:res/:segment | HLS segment (.ts) |
| GET | /live-stream/:videoId/playlist.m3u8 | Live HLS playlist |
| GET | /live-stream/:videoId/:segment | Live HLS segment |
| GET | /thumbnails/:filename | Gambar thumbnail |
| GET | /avatars/:filename | Avatar user |

---

## Cara Menjalankan

```bash
# 1. Masuk ke folder proyek
cd "D:\SOURCE CODE\gaman-2"

# 2. Install dependency
bun add jose

# 3. Pastikan FFmpeg terinstall
ffmpeg -version

# 4. (Opsional) Buat file .env
cp app/.env.example app/.env

# 5. Jalankan server
bun run app/index.ts

# 6. Buka browser
# http://localhost:3000

# 7. Buat admin pertama (setelah register, jalankan di terminal):
# bun -e "const{Database}=require('bun:sqlite');const db=new Database('app/data/app.db');db.run(\"UPDATE users SET role='admin' WHERE username='USERNAME_KAMU'\")"
```

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: Gaman v2
- **Database**: SQLite (bun:sqlite) - 10 tabel
- **Auth**: JWT (jose) + Bun.password (bcrypt) + TOTP 2FA
- **Video**: FFmpeg (HLS multi-resolusi 360p/720p/1080p)
- **Email**: SMTP (configurable, console fallback)
- **Frontend**: HTML/CSS/JS vanilla + HLS.js (CDN)
- **Rate Limiting**: In-memory (configurable per-endpoint)
