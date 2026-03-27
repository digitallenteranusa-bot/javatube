# Panduan Install JavaTube (Lengkap)

Panduan ini untuk deploy JavaTube di **Ubuntu Server** (20.04 / 22.04 / 24.04) via SSH.

---

## BAGIAN 1: AKSES SERVER

### 1.1 Login SSH ke Server

```bash
# Dari komputer lokal, buka terminal lalu:
ssh username@IP_SERVER

# Contoh:
ssh root@192.168.1.100

# Jika pakai port custom:
ssh -p 2222 root@192.168.1.100

# Jika pakai SSH key:
ssh -i ~/.ssh/id_rsa root@192.168.1.100
```

Setelah login, kamu akan masuk ke home directory (`/root/` atau `/home/username/`).

### 1.2 Cek Posisi Direktori

```bash
# Lihat kamu ada di mana
pwd
# Output: /root

# Lihat isi folder
ls -la
```

---

## BAGIAN 2: INSTALL KEBUTUHAN SISTEM

### 2.1 Update Sistem

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Git

```bash
sudo apt install git -y

# Cek
git --version
# Output: git version 2.x.x
```

### 2.3 Install Bun

```bash
curl -fsSL https://bun.sh/install | bash

# Reload shell supaya bun terdeteksi
source ~/.bashrc

# Cek
bun --version
# Output: 1.x.x
```

### 2.4 Install FFmpeg

```bash
sudo apt install ffmpeg -y

# Cek
ffmpeg -version
# Output: ffmpeg version x.x.x ...
```

### 2.5 Install Nginx (untuk reverse proxy + HTTPS)

```bash
sudo apt install nginx -y

# Cek status
sudo systemctl status nginx
# Harus "active (running)"
```

### 2.6 Install PM2 (process manager)

```bash
# Install via bun global
bun install -g pm2

# Atau via npm jika ada Node.js
# npm install -g pm2

# Cek
pm2 --version
```

---

## BAGIAN 3: CLONE & SETUP JAVATUBE

### 3.1 Pilih Direktori Install

```bash
# Masuk ke direktori yang diinginkan
cd /var/www

# Jika folder belum ada:
sudo mkdir -p /var/www
cd /var/www
```

### 3.2 Clone Repository

```bash
sudo git clone https://github.com/digitallenteranusa-bot/javatube.git
cd javatube

# Cek isi folder
ls -la
# Harus ada: app/  src/  package.json  README.md  dll
```

### 3.3 Set Kepemilikan Folder

```bash
# Supaya tidak perlu sudo terus
sudo chown -R $USER:$USER /var/www/javatube
```

### 3.4 Install Dependencies

```bash
# Pastikan kamu di folder javatube
pwd
# Output: /var/www/javatube

bun install
bun add jose
```

### 3.5 Buat File .env

```bash
# Masuk ke folder app
cd app

# Copy template
cp .env.example .env
```

#### 3.5.1 Generate JWT Secret

Sebelum edit `.env`, generate dulu secret key yang aman:

```bash
openssl rand -base64 48
```

Contoh output:

```
root@javatube:/var/www/javatube/app# openssl rand -base64 48
aB3kF8mPqR2xN5vB7wY9zA1cE4gI6hK8lO0pS3tU5wX7yA2dF4jL6nQ8rV0bM3e
```

**Copy string hasil output tersebut** (setiap kali dijalankan hasilnya akan berbeda, itu normal).

#### 3.5.2 Edit File .env

```bash
nano .env
```

Isi/edit file `.env` seperti berikut (paste JWT secret dari langkah 3.5.1):

```env
# WAJIB diganti untuk production!
# Paste hasil dari: openssl rand -base64 48
JWT_SECRET=aB3kF8mPqR2xN5vB7wY9zA1cE4gI6hK8lO0pS3tU5wX7yA2dF4jL6nQ8rV0bM3e

# Port & host
PORT=3000
HOST=0.0.0.0

# URL publik (ganti dengan domain kamu)
APP_URL=https://domain-kamu.com

# SMTP (opsional, kosongkan untuk mode dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@domain-kamu.com
```

> **PENTING:** Jangan pakai contoh JWT_SECRET di atas! Gunakan hasil `openssl rand -base64 48` milik kamu sendiri.

#### 3.5.3 Simpan dan Keluar dari Nano

1. Tekan `Ctrl+O` (simpan)
2. Tekan `Enter` (konfirmasi nama file)
3. Tekan `Ctrl+X` (keluar dari nano)

#### 3.5.4 Verifikasi

```bash
cat .env
# Pastikan JWT_SECRET sudah terisi string random, bukan "GANTI_DENGAN_STRING_RANDOM_PANJANG"
```

### 3.6 Kembali ke Folder Root Proyek

```bash
# Dari /var/www/javatube/app, naik satu level
cd ..

# Cek posisi
pwd
# Output: /var/www/javatube
```

### 3.7 Buat Folder yang Dibutuhkan

```bash
mkdir -p app/uploads/videos app/uploads/thumbnails app/uploads/hls app/uploads/avatars app/uploads/live
mkdir -p app/data
```

### 3.8 Test Jalankan

```bash
# Test dulu secara langsung
bun run app/index.ts

# Jika muncul "Server running on http://0.0.0.0:3000" → berhasil!
# Tekan Ctrl+C untuk stop
```

---

## BAGIAN 4: JALANKAN DENGAN PM2

### 4.1 Start dengan PM2

```bash
# Pastikan di folder /var/www/javatube
cd /var/www/javatube

pm2 start "bun run app/index.ts" --name javatube
```

### 4.2 Cek Status

```bash
pm2 status
# Harus menunjukkan "javatube" dengan status "online"

# Lihat log
pm2 logs javatube

# Lihat log real-time
pm2 logs javatube --lines 50
```

### 4.3 Auto-Start Saat Server Reboot

```bash
pm2 startup
# PM2 akan menampilkan perintah yang harus di-copy paste, contoh:
# sudo env PATH=$PATH:/root/.bun/bin pm2 startup systemd -u root --hp /root
# Jalankan perintah tersebut!

pm2 save
```

### 4.4 Perintah PM2 Lainnya

```bash
# Restart
pm2 restart javatube

# Stop
pm2 stop javatube

# Hapus
pm2 delete javatube

# Monitor CPU & memory
pm2 monit
```

---

## BAGIAN 5: SETUP NGINX + HTTPS

### 5.1 Buat Config Nginx

```bash
# Buat file config
sudo nano /etc/nginx/sites-available/javatube
```

Paste isi berikut (ganti `domain-kamu.com` dengan domain asli):

```nginx
# Redirect HTTP ke HTTPS
server {
    listen 80;
    server_name domain-kamu.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name domain-kamu.com;

    # SSL (akan diisi oleh certbot)
    ssl_certificate /etc/letsencrypt/live/domain-kamu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain-kamu.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Max upload 500MB
    client_max_body_size 500M;

    # Proxy ke JavaTube
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Cache static
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=604800";
    }

    # Cache HLS
    location /stream/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

Simpan: `Ctrl+O` → `Enter` → `Ctrl+X`

### 5.2 Aktifkan Site

```bash
# Buat symlink
sudo ln -s /etc/nginx/sites-available/javatube /etc/nginx/sites-enabled/

# Hapus default (opsional)
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.3 Install SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# PENTING: comment dulu blok server HTTPS di config nginx (baris listen 443...)
# Atau buat config sederhana dulu (HTTP saja), lalu jalankan:

sudo certbot --nginx -d domain-kamu.com

# Ikuti instruksi: masukkan email, setuju ToS
# Certbot otomatis update config nginx
```

### 5.4 Test & Reload Nginx

```bash
# Test config valid
sudo nginx -t
# Output harus: "syntax is ok" dan "test is successful"

# Reload
sudo systemctl reload nginx
```

### 5.5 Auto-Renew SSL

```bash
# Cek timer auto-renew (sudah otomatis dari certbot)
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## BAGIAN 6: BUAT USER ADMIN

### 6.1 Register Akun Dulu

Buka browser → `https://domain-kamu.com/register` → buat akun.

### 6.2 Jadikan Admin via Terminal

```bash
# Masuk ke folder proyek
cd /var/www/javatube

# Ganti USERNAME_KAMU dengan username yang baru didaftarkan
bun -e "
const { Database } = require('bun:sqlite');
const db = new Database('app/data/app.db');
db.run(\"UPDATE users SET role='admin' WHERE username='USERNAME_KAMU'\");
console.log('Done! User USERNAME_KAMU sekarang admin.');
"
```

---

## BAGIAN 7: FIREWALL

### 7.1 Setup UFW

```bash
# Izinkan SSH (PENTING! jangan sampai terkunci)
sudo ufw allow ssh

# Izinkan HTTP & HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Aktifkan firewall
sudo ufw enable

# Cek status
sudo ufw status
```

---

## BAGIAN 8: JIKA PAKAI IP DINAMIS

### Opsi A: Cloudflare Tunnel (Recommended, Gratis)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Login (ikuti link yang muncul)
cloudflared tunnel login

# Buat tunnel
cloudflared tunnel create javatube

# Arahkan domain ke tunnel
cloudflared tunnel route dns javatube domain-kamu.com

# Buat config
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Isi `config.yml`:

```yaml
tunnel: TUNNEL_ID_KAMU
credentials-file: /root/.cloudflared/TUNNEL_ID_KAMU.json

ingress:
  - hostname: domain-kamu.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
# Jalankan tunnel
cloudflared tunnel run javatube

# Atau jalankan via PM2 supaya auto-start
pm2 start "cloudflared tunnel run javatube" --name cf-tunnel
pm2 save
```

Dengan Cloudflare Tunnel: **tidak perlu Nginx, tidak perlu port forwarding, otomatis HTTPS**.

### Opsi B: DuckDNS (Gratis)

```bash
# Daftar di https://www.duckdns.org
# Buat subdomain, misal: javatube.duckdns.org

# Setup auto-update IP setiap 5 menit
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -s 'https://www.duckdns.org/update?domains=javatube&token=TOKEN_KAMU' > /dev/null") | crontab -
```

---

## BAGIAN 9: UPDATE & MAINTENANCE

### 9.1 Update Kode dari GitHub

```bash
cd /var/www/javatube
git pull origin main
bun install
pm2 restart javatube
```

### 9.2 Backup Database

```bash
# Backup SQLite
cp /var/www/javatube/app/data/app.db /var/www/javatube/app/data/app.db.backup

# Atau backup otomatis harian via cron
(crontab -l 2>/dev/null; echo "0 2 * * * cp /var/www/javatube/app/data/app.db /var/www/javatube/app/data/backup-\$(date +\%Y\%m\%d).db") | crontab -
```

### 9.3 Lihat Log

```bash
# Log aplikasi
pm2 logs javatube

# Log nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 9.4 Restart Semua

```bash
pm2 restart all
sudo systemctl restart nginx
```

---

## BAGIAN 10: TROUBLESHOOTING

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| `bun: command not found` | Bun belum di-reload | `source ~/.bashrc` |
| `EADDRINUSE :3000` | Port sudah dipakai | `pm2 delete javatube` lalu start ulang |
| `502 Bad Gateway` | App belum jalan | `pm2 status` → restart jika perlu |
| `ERR_CONNECTION_REFUSED` | Firewall / port belum dibuka | `sudo ufw allow 80 443` |
| `SSL Error` | Sertifikat expired | `sudo certbot renew` |
| Upload gagal / timeout | File terlalu besar | Cek `client_max_body_size` di nginx |
| Video buffering lambat | Bandwidth kurang | Kurangi resolusi transcode |
| FFmpeg error | FFmpeg belum install | `sudo apt install ffmpeg` |
| Database locked | Multiple write | Restart app: `pm2 restart javatube` |
| Permission denied | Kepemilikan folder | `sudo chown -R $USER:$USER /var/www/javatube` |

---

## RINGKASAN PERINTAH CEPAT

```bash
# === NAVIGASI ===
cd /var/www/javatube          # Masuk folder proyek
cd app                         # Masuk folder app
cd ..                          # Naik satu level
pwd                            # Lihat posisi saat ini
ls -la                         # Lihat isi folder

# === KONTROL APP ===
pm2 start "bun run app/index.ts" --name javatube   # Start
pm2 restart javatube           # Restart
pm2 stop javatube              # Stop
pm2 logs javatube              # Lihat log
pm2 status                     # Lihat status semua app

# === KONTROL NGINX ===
sudo nginx -t                  # Test config
sudo systemctl reload nginx    # Reload
sudo systemctl restart nginx   # Restart
sudo systemctl status nginx    # Status

# === KONTROL SSL ===
sudo certbot renew             # Renew sertifikat
sudo certbot renew --dry-run   # Test renew

# === UPDATE ===
cd /var/www/javatube && git pull origin main && bun install && pm2 restart javatube
```
