# PriceXpert Deployment Guide

PriceXpert includes both an interactive frontend and a Node.js Express backend that uses headless Chromium via Playwright for live price scraping.

Because Playwright requires browser binaries and system OS dependencies, deploy using one of the free cloud container/Node hosts below.

---

## Option 1: Render (Recommended — 100% Free)

Render can deploy PriceXpert directly from your GitHub repo (`https://github.com/DhruvJyotikar/PriceXpert`).

### Steps:
1. Go to [render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** > **Web Service**.
3. Select **Build and deploy from a Git repository** and connect `DhruvJyotikar/PriceXpert`.
4. Configure the service settings:
   - **Name**: `pricexpert`
   - **Region**: Choose any (e.g. Oregon / Frankfurt / Singapore)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx playwright install --with-deps chromium
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: **Free**
5. Click **Create Web Service**.
6. Once built, Render will give you a public URL (e.g. `https://pricexpert.onrender.com`). Both the UI and the live scraper will be live on this single URL!

---

## Option 2: Railway

1. Go to [railway.app](https://railway.app) and log in with GitHub.
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select `DhruvJyotikar/PriceXpert`.
4. Railway will automatically detect the `Dockerfile` in the repository and build it.
5. In your service settings, click **Generate Domain** to get your public live URL.

---

## Option 3: Docker (Any VPS / Cloud)

Run with Docker:
```bash
docker build -t pricexpert .
docker run -d -p 3001:3001 --name pricexpert pricexpert
```
Visit `http://localhost:3001` or your server IP.
