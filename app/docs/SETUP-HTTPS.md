# Setup HTTPS dengan Let's Encrypt (Server Lokal + Domain)

## Prasyarat

- Server Ubuntu (bisa di PC lokal)
- Domain sudah diarahkan ke IP publik kamu
- Port 80 dan 443 sudah di-forward di router

---

## Langkah 1: Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

## Langkah 2: Install Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

## Langkah 3: Copy Config Nginx

```bash
# Copy file nginx.conf dari docs ke Nginx
sudo cp nginx.conf /etc/nginx/sites-available/gamantube

# Edit domain name
sudo nano /etc/nginx/sites-available/gamantube
# Ganti semua "contoh-domain.my.id" dengan domain kamu

# Aktifkan site
sudo ln -s /etc/nginx/sites-available/gamantube /etc/nginx/sites-enabled/

# Hapus default site (opsional)
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

## Langkah 4: Dapatkan SSL Certificate

```bash
# Untuk pertama kali, comment dulu blok server HTTPS di nginx.conf
# Biarkan hanya blok HTTP yang aktif, lalu:

sudo certbot --nginx -d contoh-domain.my.id
# Ikuti instruksi, masukkan email, setuju ToS

# Certbot akan otomatis mengupdate config Nginx
```

## Langkah 5: Auto-Renew Certificate

Let's Encrypt certificate berlaku 90 hari. Certbot sudah setup auto-renew:

```bash
# Cek timer auto-renew
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

## Langkah 6: Jalankan JavaTube

```bash
# Install PM2 untuk process management
npm install -g pm2

# Jalankan server
cd /path/to/gaman-2
pm2 start "bun run app/index.ts" --name gamantube

# Auto-start saat boot
pm2 startup
pm2 save
```

## Langkah 7: Setup .env untuk Production

```bash
cd /path/to/gaman-2/app
cp .env.example .env

# Edit .env
nano .env
# Set JWT_SECRET dengan string random yang kuat:
# JWT_SECRET=$(openssl rand -base64 32)
```

---

## Port Forwarding di Router

1. Masuk ke admin router (biasanya 192.168.1.1)
2. Cari menu Port Forwarding / Virtual Server / NAT
3. Tambahkan rule:
   - Port 80 (HTTP) → IP lokal server : 80
   - Port 443 (HTTPS) → IP lokal server : 443

## Jika IP Dinamis (Tidak Statis)

Gunakan salah satu:

### Opsi A: Cloudflare Tunnel (Gratis, Recommended)
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Login & buat tunnel
cloudflared tunnel login
cloudflared tunnel create gamantube
cloudflared tunnel route dns gamantube contoh-domain.my.id

# Jalankan tunnel
cloudflared tunnel run gamantube
```
Dengan Cloudflare Tunnel, tidak perlu port forwarding dan otomatis HTTPS.

### Opsi B: DuckDNS (Gratis)
1. Daftar di https://www.duckdns.org
2. Buat subdomain (contoh: gamantube.duckdns.org)
3. Setup cron untuk update IP otomatis:
```bash
echo "*/5 * * * * curl -s 'https://www.duckdns.org/update?domains=gamantube&token=YOUR_TOKEN'" | crontab -
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| ERR_CONNECTION_REFUSED | Cek port forwarding & firewall |
| 502 Bad Gateway | JavaTube server belum jalan (`pm2 status`) |
| SSL Error | Jalankan `sudo certbot renew` |
| Upload timeout | Naikkan `proxy_read_timeout` di nginx.conf |
| Video buffering | Bandwidth upload ISP kurang, kurangi resolusi |
