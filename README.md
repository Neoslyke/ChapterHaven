# 📖 ChapterHaven

> An ultra-fast, text-only Manga, Manhwa, and Manhua chapter tracking web application designed specifically for low-overhead self-hosting on **Oracle Cloud Free Tier**.

---

## ✨ Features

- **⚡ Instant In-Memory Live Search**: Zero-latency search across 1,000+ titles and alternative names in under 2 milliseconds.
- **⭐ Pinned Favourites**: Star icon before each title. Favourited titles form their own category at the very top, strictly sorted alphabetically (e.g. a favourite starting with "Z" will always remain on top of a non-favourite starting with "A").
- **🔤 Strict Alphabetical Sorting**: Natural alphabetical ordering (A &rarr; Z) across both favourites and main collections.
- **📝 Alternative Titles**: Support for multiple alternative names (Korean, Japanese, Chinese, English, romanized titles). The live search indexes all alternate titles.
- **➕ Quick Chapter Increments**: One-tap `[+]` and `[-]` buttons next to each chapter number for instantaneous tracking without opening menus, or click to input decimals (e.g., `14.5`).
- **📱 Clean, Text-Only & Dark Mode**: Zero heavy image bandwidth or broken CDNs. Loads in milliseconds even on spotty mobile networks.
- **🔒 WebDAV-Style Native Login**: Native HTTP Basic Authentication challenge dialog (`401 WWW-Authenticate`) pops up immediately when accessing `http://<my_oracle_ip>/chapterhaven`.
- **🛡️ Stealth Root (ERR_EMPTY_RESPONSE)**: Accessing the bare IP `http://<my_oracle_ip>` immediately drops the connection with zero bytes sent (`ERR_EMPTY_RESPONSE`), identical to WebDAV / Nginx `return 444;`. It never forwards or redirects to `/chapterhaven`, keeping your tracker completely hidden from scanners and crawlers.
- **⇄ Bulk Import & Export**: Easily import your existing 1,000+ titles via Quick Text Paste, JSON, or CSV in less than 2 seconds. Export JSON/CSV backups anytime.
- **🗃️ Persistent SQLite Database**: Lightweight, zero-maintenance single-file SQLite database with Write-Ahead Logging (WAL) mounted to a persistent volume.

---

## 🚀 Quick Start (Local Run)

### Using Node.js directly
Requires Node.js 22+:
```bash
# 1. Install dependencies
npm install

# 2. Configure credentials
cp .env.example .env

# 3. Start server
npm start
```
Access the application at: **`http://localhost:3000/chapterhaven`**  
Default credentials:
- **Username**: `admin`
- **Password**: `chapterhaven123`

---

## 🐳 Docker Deployment

To launch ChapterHaven in Docker:
```bash
# Start container in background
docker compose up -d

# View logs
docker compose logs -f

# Stop container
docker compose down
```

The container maps host port `80` to port `3000`, so you can access the app directly at:  
👉 **`http://<YOUR_IP>/chapterhaven`**

---

## ☁️ Step-by-Step Setup Guide: Oracle Cloud Free Tier

This guide walks you through deploying ChapterHaven on an **Oracle Cloud Free Tier** Ubuntu or Oracle Linux VM.

### Step 1: Open Port 80 in Oracle Cloud Console (VCN Ingress Rules)
By default, Oracle Cloud blocks incoming web traffic at the virtual network level.

1. Log into your [Oracle Cloud Console](https://cloud.oracle.com/).
2. Open the navigation menu &rarr; **Networking** &rarr; **Virtual Cloud Networks**.
3. Click on your VCN (e.g. `vcn-...`).
4. Click on **Security Lists** (left sidebar), then click on the **Default Security List**.
5. Click **Add Ingress Rules**:
   - **Source Type**: `CIDR`
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Source Port Range**: *(leave blank or All)*
   - **Destination Port Range**: `80` *(and `443` if you plan to use HTTPS)*
   - **Description**: `Allow HTTP for ChapterHaven`
6. Click **Add Ingress Rules**.

---

### Step 2: Open Port 80 in the VM Operating System Firewall
Oracle Cloud VM images (both Ubuntu and Oracle Linux) have internal firewalls (`iptables` / `firewalld`) enabled by default that will block port 80 even after opening the VCN security list.

SSH into your Oracle VM:
```bash
ssh -i /path/to/your-key ubuntu@<YOUR_ORACLE_IP>
```

#### If using Ubuntu:
```bash
# Insert rule to allow port 80
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Save iptables rules so they persist across reboots
sudo netfilter-persistent save
```
*(If `netfilter-persistent` is not installed: `sudo apt-get update && sudo apt-get install -y iptables-persistent`)*

#### If using Oracle Linux:
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

---

### Step 3: Install Docker & Docker Compose on the Oracle VM

Run the following commands on your Oracle VM:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-v2

# Start and enable Docker service
sudo systemctl enable --now docker

# (Optional) Allow current user to run docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 4: Deploy ChapterHaven

1. Clone or copy your ChapterHaven repository into the VM:
```bash
git clone https://github.com/<your-username>/ChapterHaven.git
cd ChapterHaven
```
*(Or transfer the folder using SCP / SFTP)*

2. Create your `.env` file to customize your login credentials:
```bash
cp .env.example .env
nano .env
```
Set your desired username and password:
```env
AUTH_USER=myusername
AUTH_PASS=my_super_secret_password
```
*(Save and exit nano: `Ctrl+O`, `Enter`, `Ctrl+X`)*

3. Start ChapterHaven with Docker Compose:
```bash
docker compose up -d --build
```

4. Verify that the container is healthy and running:
```bash
docker compose ps
```

---

### Step 5: Verify Stealth & Access ChapterHaven

#### 1. Test Stealth on Root IP:
If you or anyone visits:
```
http://<YOUR_ORACLE_IP>
```
The browser will **not** redirect. It will immediately show:
```
This page isn’t working
<YOUR_ORACLE_IP> didn’t send any data.
ERR_EMPTY_RESPONSE
```
The connection is dropped immediately without sending any headers or page content, keeping your tracker hidden from scanners.

#### 2. Access ChapterHaven:
Navigate specifically to:
```
http://<YOUR_ORACLE_IP>/chapterhaven
```
1. The browser immediately triggers the **WebDAV-style native authentication dialog** (`401 WWW-Authenticate`).
2. Enter the username and password you defined in `.env`.
3. The dashboard loads instantly!

---

## 🔀 Running Alongside an Existing WebDAV / Nginx Setup

If you already have Nginx running WebDAV on port 80/443 on your Oracle VM and returning `ERR_EMPTY_RESPONSE` (`return 444;`) on `/`:

1. Change the port mapping in `docker-compose.yml` to internal only:
```yaml
ports:
  - "127.0.0.1:3000:3000"
```

2. Add this location block inside your existing Nginx server block (`/etc/nginx/sites-available/...`):
```nginx
server {
    listen 80 default_server;
    server_name _;

    # Dropping connection on bare IP with zero data (ERR_EMPTY_RESPONSE)
    location / {
        return 444;
    }

    # Your existing WebDAV location
    # location /webdav { ... }

    # ChapterHaven route
    location /chapterhaven {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
Both your WebDAV and ChapterHaven will be accessible on their respective subpaths, while `http://<YOUR_ORACLE_IP>` gives `ERR_EMPTY_RESPONSE`!

---

## 📥 How to Import Your 1,000 Existing Titles

1. In ChapterHaven, click the **`⇄ Import / Export`** button in the top right.
2. Choose **Quick Text Paste**:
   - You can paste titles one per line:
     ```text
     Solo Leveling
     Omniscient Reader's Viewpoint
     Return of the Mount Hua Sect
     ```
   - Or include alternative names and current chapters separated by pipes `|`:
     ```text
     Solo Leveling | Only I Level Up | 179
     Omniscient Reader's Viewpoint | ORV | 225
     Magic Emperor | Demonic Emperor | 540
     ```
3. Click **Import Pasted Titles**.
4. The database inserts all 1,000 titles in a single transaction in less than a second!

---

## 💾 Backups & Data Persistence

Your entire database is stored in a single SQLite file located on the host at `./data/chapterhaven.db`.

- **Backup anytime**: Click **`⇄ Import / Export`** &rarr; **Export / Backup** &rarr; **Download JSON Backup**.
- **Server-side backup**: Simply copy `./data/chapterhaven.db` to your local machine or cloud storage.
- All data survives container rebuilds, server updates, and VM reboots!

---

## 🔒 Optional: Free HTTPS / SSL with Cloudflare Tunnel

If you'd like a custom domain with free automatic SSL (HTTPS) without opening any ports:
1. Create a free account at [Cloudflare](https://dash.cloudflare.com/).
2. Go to **Zero Trust** &rarr; **Networks** &rarr; **Tunnels**.
3. Create a tunnel, install `cloudflared` on your Oracle VM, and route `yourdomain.com/chapterhaven` to `http://localhost:3000/chapterhaven`.

