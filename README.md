# 📦 ChapterHaven

> An ultra-fast, text-only Manga, Manhwa, and Manhua chapter tracker designed for lightweight self-hosting on Oracle Cloud Free Tier or any Docker-compatible server.

[![Build & Publish Docker Image](https://github.com/Neoslyke/ChapterHaven/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Neoslyke/ChapterHaven/actions/workflows/docker-publish.yml)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker)](https://github.com/Neoslyke/ChapterHaven/pkgs/container/chapterhaven)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

## ✨ Features

- **⚡ Instant In-Memory Live Search**: Sub-millisecond live search (< 2 ms) across 1,000+ titles with real-time term highlighting.
- **⭐ Pinned Favourites & Natural A-Z Sort**: Star titles to pin them at the top, with automatic alphabetical ordering across all categories.
- **🌓 Dark & Light Theme**: Built-in toggle with Sun ☀️ and Moon 🌙 icons that automatically respects your system preference.
- **➕ Quick Stepper Controls**: One-tap chapter increment and decrement buttons with support for custom decimals (e.g., `14.5`).
- **⇄ Bulk Import & Export**: Instant 1-second import/export for thousands of titles via text paste, JSON, or CSV.
- **🗃️ Persistent SQLite Database**: Zero-maintenance single-file SQLite database with Write-Ahead Logging (WAL).
- **🛡️ Stealth Root (ERR_EMPTY_RESPONSE)**: Accessing the bare server IP immediately terminates the connection with zero bytes sent, keeping your tracker hidden from scanners.
- **🚀 Subpath & Reverse-Proxy Ready**: Runs seamlessly under `/chapterhaven` or at the root `/`.
- **🐳 Multi-Architecture Docker Image**: Prebuilt images for both `linux/amd64` and `linux/arm64` (Apple Silicon, Raspberry Pi, Oracle Cloud ARM Ampere A1).

---

## 🚀 Quick Start with Docker

### Option 1: Docker Run (Fastest)

```bash
docker run -d \
  --name chapterhaven \
  -p 3000:3000 \
  -e PORT=3000 \
  -e BASE_PATH=/chapterhaven \
  -e DATA_DIR=/app/data \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/neoslyke/chapterhaven:latest
```

Access your app at `http://localhost:3000/chapterhaven`.

### Option 2: Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/Neoslyke/ChapterHaven.git
cd ChapterHaven
```

2. Configure your environment:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the container:

```bash
docker compose up -d
```

4. Open `http://localhost:3000/chapterhaven` in your browser.

---

## ☁️ Deployment Guide: Oracle Cloud Free Tier

### 1. Ingress Rule (Oracle Cloud Console)

1. In the Oracle Cloud Console, navigate to **Networking** → **Virtual Cloud Networks** → your VCN.
2. Under **Security Lists**, open the default security list.
3. Add an Ingress Rule:

- **Source CIDR**: `0.0.0.0/0`
- **IP Protocol**: `TCP`
- **Destination Port Range**: `80, 443`
- **Description**: `HTTP/HTTPS Ingress`

### 2. VM Operating System Firewall

SSH into your Oracle VM:

```bash
ssh -i /path/to/key ubuntu@<YOUR_SERVER_IP>
```

Allow the required ports through Ubuntu's internal firewall:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 🔀 Running Behind a Reverse Proxy

### Caddy (Recommended)

If your server runs Caddy (e.g. from `~/projects/docker-compose.yml`):

**Step 1 — Add the service to `docker-compose.yml`:**

```yaml
  chapterhaven:
    image: ghcr.io/neoslyke/chapterhaven:latest
    container_name: chapterhaven
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      - PORT=3000
      - BASE_PATH=/chapterhaven
      - DATA_DIR=/app/data
    volumes:
      - ./ChapterHaven/data:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Ensure `chapterhaven` is listed under the `caddy` service's `depends_on`.

**Step 2 — Add a route to the `Caddyfile`:**

Inside your domain block in `~/projects/proxy/Caddyfile`:

```caddy
    # ChapterHaven
    handle /chapterhaven* {
        reverse_proxy chapterhaven:3000
    }
```

**Step 3 — Launch and reload Caddy:**

```bash
cd ~/projects
docker compose pull chapterhaven
docker compose up -d chapterhaven
docker compose exec caddy caddy reload
```

### Nginx (Alternative)

If using Nginx on your server:

```nginx
    # ChapterHaven Route
    location /chapterhaven {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

---

## 🔄 Updating to the Latest Version

### Quick update via Docker Compose

```bash
cd ~/projects
docker compose pull chapterhaven && docker compose up -d chapterhaven
```

### Or using `update.sh`

```bash
bash ~/projects/update.sh
```

---

## 💻 Local Development

To run the project locally without Docker:

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Or run the standard production start
npm start
```

Visit `http://localhost:3000` or `http://localhost:3000/chapterhaven`.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0) — see the [LICENSE](LICENSE) file for details.
