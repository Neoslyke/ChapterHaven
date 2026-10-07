# 📖 ChapterHaven

> An ultra-fast, text-only Manga, Manhwa, and Manhua chapter tracking web application designed for lightweight self-hosting on **Oracle Cloud Free Tier** alongside WebDAV / Nginx.

---

## ✨ Features

- **⚡ Instant In-Memory Live Search**: Sub-millisecond live search (< 2 ms) across 1,000+ titles, searching both primary titles and all alternative names simultaneously with real-time term highlighting.
- **⭐ Pinned Favourites**: Star icon (`★` / `☆`) before each title. Favourited titles form their own category at the very top, strictly sorted alphabetically (e.g. a favourite starting with "Z" will always remain on top of a non-favourite starting with "A").
- **🔤 Strict Alphabetical Sorting**: Natural alphabetical ordering (A &rarr; Z) across both favourites and main collections.
- **📝 Alternative Titles**: Support for multiple alternative names (Korean, Japanese, Chinese, English, romanized titles).
- **➕ Quick Chapter Increments**: One-tap `[+]` and `[-]` buttons next to each chapter number for instantaneous tracking without opening menus, or click to input custom decimals (e.g., `14.5`).
- **📱 Clean, Text-Only & Dark Mode**: Zero heavy image bandwidth, zero broken CDN covers, and zero lag. Fast loading on mobile and desktop.
- **🔒 WebDAV-Style Native Login**: Native HTTP Basic Authentication challenge dialog (`401 WWW-Authenticate`) pops up immediately before serving any content.
- **🛡️ Stealth Root (ERR_EMPTY_RESPONSE)**: Accessing the bare IP `http://<my_oracle_ip>` immediately drops the connection with zero bytes sent (`ERR_EMPTY_RESPONSE`), identical to Nginx `return 444;`. It never forwards or redirects to `/chapterhaven`, keeping your tracker completely hidden from scanners and crawlers.
- **⇄ Bulk Import & Export**: Import 1,000+ titles via Quick Text Paste, JSON, or CSV in under 1 second. Export full JSON/CSV backups anytime.
- **🗃️ Persistent SQLite Database**: Lightweight, zero-maintenance single-file SQLite database with Write-Ahead Logging (WAL) mounted to a persistent volume.

---

## 📁 Project Structure

```
ChapterHaven/
├── Dockerfile                  # Lightweight Node 22 Alpine container
├── docker-compose.yml          # Docker Compose with persistent storage & WebDAV network
├── .env.example / .env         # Port, credentials, and base path settings
├── package.json                # Express server & built-in Node SQLite
├── list_cleaned.txt            # 1,019 deduplicated titles ready for Quick Text Paste
├── list_cleaned.json           # 1,019 deduplicated titles ready for JSON file import
├── list_formatted.txt          # 1,024 formatted titles (Title | Alt Titles | Chapter)
├── list_import.json            # 1,024 formatted titles in JSON format
├── public/
│   ├── index.html              # Clean semantic markup with modals & live search
│   ├── style.css               # Sleek dark theme, responsive typography & badges
│   └── app.js                  # In-memory instant search, CRUD, and bulk importer
├── src/
│   ├── auth.js                 # Native HTTP Basic Auth (WebDAV-style)
│   ├── db.js                   # High-performance SQLite manager (WAL mode)
│   └── server.js               # Subpath mounting, stealth drop & REST API routes
└── scripts/
    ├── parse-list.js           # Converter script for raw lists
    ├── find-duplicates.js      # Diagnostic script for duplicate detection
    └── test-server.js          # Automated integration test suite
```

---

## ☁️ Deployment Guide: Oracle Cloud Free Tier

### 1. Ingress Rule (Oracle Cloud Console)
1. In Oracle Cloud Console, navigate to **Networking** &rarr; **Virtual Cloud Networks** &rarr; Your VCN.
2. Under **Security Lists**, open the default security list.
3. Add Ingress Rule:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80` *(and `443` if using SSL)*
   - **Description**: `HTTP Ingress`

### 2. VM Operating System Firewall
SSH into your Oracle VM:
```bash
ssh -i /path/to/key ubuntu@<YOUR_ORACLE_IP>
```
Allow port 80 through Ubuntu's internal firewall:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 🔀 Running Alongside an Existing WebDAV / Nginx Proxy

If your Oracle VM already runs WebDAV behind an Nginx container (`webdav_proxy`) on port 80:

### Step 1: Configure ChapterHaven's `docker-compose.yml`
Ensure ChapterHaven connects to the WebDAV Docker network (e.g. `webdav-server_default`):

```yaml
services:
  chapterhaven:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: chapterhaven
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - PORT=3000
      - BASE_PATH=/chapterhaven
      - AUTH_ENABLED=${AUTH_ENABLED:-true}
      - AUTH_USER=${AUTH_USER:-admin}
      - AUTH_PASS=${AUTH_PASS:-chapterhaven123}
      - DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
    networks:
      - default
      - webdav-server_default
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  webdav-server_default:
    external: true
```

Start or restart ChapterHaven:
```bash
cd ~/ChapterHaven
docker compose up -d --build
```

### Step 2: Add Route to WebDAV Nginx Config
Edit your WebDAV Nginx configuration file (e.g. `/home/ubuntu/webdav-server/nginx.conf`):

```nginx
server {
    listen 80 default_server;
    server_name _;

    # Drops connection on bare IP with zero bytes (ERR_EMPTY_RESPONSE)
    location / {
        return 444;
    }

    # Your existing WebDAV configuration
    # location /webdav { ... }

    # ChapterHaven Route
    location /chapterhaven {
        auth_basic off;
        proxy_pass http://chapterhaven:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Passes login credentials directly to ChapterHaven
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
    }
}
```

> **Why `auth_basic off;` and `proxy_set_header Authorization`?**  
> If Nginx has authentication enabled for WebDAV, Nginx intercepts the `Authorization` header by default. Setting `auth_basic off;` and forwarding the header ensures your login prompt goes straight to ChapterHaven.

### Step 3: Reload Nginx
```bash
docker exec webdav_proxy nginx -s reload
```

---

## 🔍 Verification

1. **Test Root Stealth:**
   ```
   http://<YOUR_ORACLE_IP>
   ```
   Result: **No redirect**. The browser immediately shows:
   ```text
   This page isn’t working
   <YOUR_ORACLE_IP> didn’t send any data.
   ERR_EMPTY_RESPONSE
   ```

2. **Access Tracker:**
   ```
   http://<YOUR_ORACLE_IP>/chapterhaven
   ```
   Result: The native WebDAV-style login prompt opens. Enter your credentials (default: `admin` / `chapterhaven123`), and your library loads immediately!

---

## 📥 How to Bulk Import Your Manga Collection

You have two pre-processed files ready to import:

### Option A: Quick Text Paste (1-Click)
1. Open **`list_cleaned.txt`** (contains 1,019 clean, deduplicated titles).
2. Select all (`Ctrl+A`) and copy (`Ctrl+C`).
3. In ChapterHaven (`http://<YOUR_ORACLE_IP>/chapterhaven`), click **`⇄ Import / Export`** in the top right.
4. On the **Quick Text Paste** tab, paste the lines into the box:
   ```text
   Solo Leveling | Only I Level Up | 179
   Da Zhu Zai | The Great Ruler | 171
   6 Worlds Of Cultivation | | 14
   ```
5. Click **Import Pasted Titles**.
6. The entire collection will import in **under 1 second**.

### Option B: File Upload
1. In the **`⇄ Import / Export`** modal, switch to the **Import JSON / CSV** tab.
2. Upload **`list_cleaned.json`**.
3. Click **Import File**.

---

## 💾 Backups & Data Persistence

Your entire database is stored in a single SQLite file located on the host at:
```
~/ChapterHaven/data/chapterhaven.db
```

- **In-App Backup**: Click **`⇄ Import / Export`** &rarr; **Export / Backup** &rarr; **Download JSON Backup**.
- **Host Backup**: Simply copy `./data/chapterhaven.db` to another machine or cloud storage.
- All titles survive container rebuilds, updates, and VM reboots!
