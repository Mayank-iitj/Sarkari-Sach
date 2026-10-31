# 🚀 Sarkari Sach — Production Deployment Guide

This guide walks you through deploying **Sarkari Sach (सरकारी सच)** to production:
- **Backend (FastAPI + SQLite/Postgres + AI Pipeline)** ➡️ **[Render](https://render.com)**
- **Frontend (Next.js 14 App Router + Tailwind + HTML5 Canvas)** ➡️ **[Vercel](https://vercel.com)**

---

## 🏛️ Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │            Vercel Frontend             │
                        │    (Next.js 14 App Router, React)      │
                        │   https://sarkari-sach.vercel.app       │
                        └──────────────────┬─────────────────────┘
                                           │
                        NEXT_PUBLIC_API_URL (HTTPS REST / SSE)
                                           │
                                           ▼
                        ┌────────────────────────────────────────┐
                        │             Render Backend             │
                        │     (FastAPI, Python 3.12, Uvicorn)    │
                        │  https://sarkari-sach-api.onrender.com │
                        └──────────────────┬─────────────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
       [Primary Fact Pipeline]                         [Data & Storage]
   - DuckDuckGo Gov Search (Live)                 - SQLite (data/sach.db) or
   - Rule Zero Deterministic Engine                  Render Managed Postgres
   - Google Gemini 2.5 Flash / Flash-Lite         - Gazette & PIB Ingestion
   - 1080x1080 Verified Card Canvas
```

---

## 📦 Part 1: Deploying the Backend to Render

### Option A: Using Render Blueprint (`render.yaml` — Recommended)
1. Go to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** ➡️ **Blueprint**.
3. Connect your GitHub repository (`https://github.com/Mayank-iitj/Sarkari-Sach.git`).
4. Render will automatically detect `render.yaml` and configure the service.
5. Click **Apply**.

---

### Option B: Manual Web Service Setup
1. In your **Render Dashboard**, click **New +** ➡️ **Web Service**.
2. Connect your GitHub repository (`Sarkari-Sach`).
3. Fill in the service configuration:
   - **Name**: `sarkari-sach-api`
   - **Region**: Choose the closest region to your users (e.g., *Singapore* or *Oregon*).
   - **Root Directory**: `sarkari-sach/backend` (or `backend` if deploying from `sarkari-sach` subfolder)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: `Free` (or Starter for persistent background tasks)

4. **Environment Variables**:
   Under **Environment Variables**, add the following:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.12.7` | Matches Python runtime |
   | `PYTHONIOENCODING` | `utf-8` | Prevents charmap crashes on Hindi/Devanagari text |
   | `PYTHONUTF8` | `1` | Forces UTF-8 mode in Python |
   | `OFFLINE_MODE` | `false` | Enables live searching against official portals |
   | `LLM_PROVIDER` | `gemini` (or `fake`) | Use `gemini` if providing API key, otherwise `fake` |
   | `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
   | `CORS_ORIGINS` | `*` | Or set to your Vercel URL once deployed |

5. **Health Check Path**:
   - Under **Advanced Settings**, set **Health Check Path** to:
     ```
     /v1/health
     ```
6. Click **Create Web Service**.
7. Once deployed, copy your Render backend URL:
   `https://sarkari-sach-api.onrender.com`

---

## ⚡ Part 2: Deploying the Frontend to Vercel

1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click **Add New...** ➡️ **Project**.
3. Import your GitHub repository (`Sarkari-Sach`).
4. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select:
     ```
     sarkari-sach/frontend
     ```
     *(If deploying a branch or repo where frontend is at root, leave as `./`)*
5. **Environment Variables**:
   Expand the **Environment Variables** section and add:
   | Key | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://sarkari-sach-api.onrender.com` |
   *(Replace with your actual Render service URL from Part 1, without a trailing slash).*

6. Click **Deploy**.
7. In ~60 seconds, Vercel will complete the build and assign your domain:
   `https://sarkari-sach.vercel.app`

---

## 🎨 Part 3: Verified Share Card & WhatsApp Canvas

The verification card banner matches the compact, high-converting WhatsApp action card:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Send verified reply back to your WhatsApp group                                        │
│ Download the verified card image or share directly on WhatsApp to stop misinformation. │  [ 📥 Download Card ]  [ 💬 Share on WhatsApp ]
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities:
- **Instant Client-Side HD PNG Generation:** Renders a 1080×1080 high-DPI official verification badge with Indian tricolor, official verdict icon, claim in circulation, primary government record citation, and cryptographic audit link.
- **Zero-Latency Downloads:** Clicking **Download Card** exports the PNG directly in the client browser with zero server latency or CORS overhead.
- **WhatsApp Web & Mobile 1-Click Sharing:** Pre-populates the verified verdict, plain-language summary, and public audit URL directly into WhatsApp groups.
- **Discreet Canvas Preview:** Click the eye toggle icon to expand or inspect the live rendered canvas and copy the image directly to your clipboard.

---

## 🧪 Part 4: Post-Deployment Smoke Test Checklist

Once both services are deployed, test the full stack:

### 1. Backend Health Check
Open `https://<your-render-app>.onrender.com/v1/health` in your browser.
**Expected Response:**
```json
{
  "status": "healthy",
  "offline_mode": false,
  "live_search_available": true,
  "db_connected": true,
  "system_time": "2026-10-31T..."
}
```

### 2. Live Fact Check & Real-Time SSE Stream
1. Open your Vercel URL: `https://<your-vercel-app>.vercel.app`.
2. Submit a known claim:
   > *"Under PM KISAN 20th instalment, farmers will receive ₹4,000 instead of ₹2,000 on Diwali."*
3. Watch the real-time SSE progress bar advance through:
   `Extracting Claim` ➔ `Searching Official Portals` ➔ `Evaluating Provenance` ➔ `Verdict Badge`.
4. Verify the verdict returns **[ ALTERED ]** or **[ FORGED ]** with exact citations from `pmkisan.gov.in` and `pib.gov.in`.

### 3. WhatsApp Interactive Sandbox
1. Navigate to `/whatsapp` on your Vercel app.
2. Select any sample forwarded message or paste your own viral forward.
3. Click **Send Message**.
4. Confirm the automated bot reply generates within seconds with verdict badge, primary citations, and audio voice note link.

### 4. Verified Share Card Download
1. On the verification result page `/c/<check_id>`, click **Download Card**.
2. Verify the browser downloads `sarkari-sach-verified-<id>.png` (1080×1080 HD).
3. Open the image to verify crisp typography and tricolor accent styling.

---

## 🛠️ Troubleshooting & Frequently Asked Questions

### Q1: Render says "Starting service with 'uvicorn app.main:app' failed"?
**Solution:** Make sure your **Root Directory** in Render is set to `sarkari-sach/backend` (or you pass `--app-dir backend` if deploying from the repo root).

### Q2: "NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres" on Render?
**Solution:** Render Managed PostgreSQL sets `DATABASE_URL` with `postgres://`. In `app/settings.py` and `app/db.py`, Sarkari Sach automatically converts `postgres://` to `postgresql+asyncpg://` and `postgresql://`.

### Q3: Vercel displays "Failed to fetch" on verification?
**Solution:**
1. Check that `NEXT_PUBLIC_API_URL` on Vercel is set to your Render backend URL (e.g. `https://sarkari-sach-api.onrender.com`).
2. Verify the Render service is not sleeping (Render Free tier sleeps after 15 minutes of inactivity; waking up takes ~30 seconds).

---

*Rule Zero: The system never presents a factual claim as verified without a direct reference to a primary government source.*
