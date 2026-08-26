# REVENUEAI — CLOUD DEPLOYMENT & OPERATIONS GUIDE

> **Classification**: Cloud-Hosted Demo / Staging Deployment  
> **Payment Mode**: Simulation & Mock Mode strictly enforced (`ALLOW_REAL_MONEY_MOVEMENT=false`, `PAYMENT_PROVIDER=mock`)  
> **AI Inference**: Groq API Server-Side Integration (`openai/gpt-oss-120b`) with Deterministic Heuristic Fallback  
> **Safety Engine**: 7 Deterministic Safety Guardrails with Sealed Audit Trail  

---

## 1. System Architecture

```
                       PUBLIC INTERNET
                              │
                            HTTPS
                              ▼
        ┌───────────────────────────────────────────┐
        │        RevenueAI Frontend (React/Vite)    │
        │     - Deployed on Vercel / Render Static   │
        │     - Pure Static SPA + Secure API Proxy  │
        └─────────────────────┬─────────────────────┘
                              │ HTTPS API Requests
                              │ (Bearer JWT Auth)
                              ▼
        ┌───────────────────────────────────────────┐
        │        RevenueAI Backend (FastAPI)        │
        │     - Deployed on Render / Railway / OCI  │
        │     - Production ASGI Server (Uvicorn)    │
        │     - Autonomous AI Recovery Engine       │
        │     - Deterministic Safety Guardrails     │
        └───────┬───────────────────┬───────────────┘
                │                   │
      Database  │                   │ Server-Side LLM
     Operations │                   │ API Inference
                ▼                   ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ Managed PostgreSQL   │  │ Groq AI API Engine   │
    │ - Neon / Render DB   │  │ - openai/gpt-oss-120b│
    │ - Persistent Storage │  │ - Zero Client Access │
    └──────────────────────┘  └──────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │ Mock Payment Gateway │
    │ - Zero Real Money    │
    │ - Safe Sandbox State │
    └──────────────────────┘
```

### Security & Architecture Boundaries
1. **Client Isolation**: The browser **never** connects directly to the database or Groq AI API. All calls pass through the FastAPI backend.
2. **Deterministic Safety Barrier**: The AI agent **cannot write directly to the database** or execute actions without passing through 7 deterministic, arithmetic guardrail policies.
3. **Financial Safety**: Real money movement is permanently disabled (`ALLOW_REAL_MONEY_MOVEMENT=false`).

---

## 2. Cloud Platform Recommendations

| Tier | Component | Recommended Provider | Alternative Providers |
| :--- | :--- | :--- | :--- |
| **Option A (1-Click Unified)** | Backend + Frontend + DB | **Render** (`render.yaml` included) | **Railway** / **Fly.io** |
| **Option B (Decoupled Best-of-Breed)** | Frontend | **Vercel** (`vercel.json` included) | **Cloudflare Pages** / **Netlify** |
| | Backend | **Render Web Service** / **Railway** | **Google Cloud Run** / **Fly.io** |
| | Database | **Neon Serverless PostgreSQL** | **Supabase** / **Render Postgres** |

---

## 3. Environment Variables Reference

> [!IMPORTANT]
> **Security Rule**: Never commit `.env` files or secret values to version control. Set these in your cloud provider's web console.

### Backend Environment Variables

| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/dbname` | Managed PostgreSQL connection string (supports `postgres://` auto-normalization) |
| `SECRET_KEY` | **Yes** | `64+ char random string` | Secret key for signing and validating JWT tokens |
| `AI_PROVIDER` | **Yes** | `generic_llm` | AI provider mode (`generic_llm` or `heuristic`) |
| `AI_API_KEY` | **Yes** | `gsk_...` | Groq API Key (kept strictly server-side) |
| `AI_MODEL` | No | `openai/gpt-oss-120b` | LLM model identifier for Groq API |
| `AI_BASE_URL` | No | `https://api.groq.com/openai/v1` | Base URL for OpenAI-compatible Groq endpoint |
| `PAYMENT_PROVIDER` | **Yes** | `mock` | Payment gateway integration mode (`mock` or `razorpay_test`) |
| `ALLOW_REAL_MONEY_MOVEMENT` | **Yes** | `false` | Financial safety kill-switch (must remain `false`) |
| `MAX_RECOVERY_RETRIES` | No | `3` | Maximum automated retry limit before escalation |
| `ENVIRONMENT` | No | `production` | Environment mode (`production` or `development`) |
| `PORT` | No | Cloud-assigned (e.g. `8000`, `10000`) | Server port dynamically bound by ASGI server |
| `HOST` | No | `0.0.0.0` | Host interface for container binding |
| `CORS_ORIGINS` | **Yes** | `https://<frontend-domain>` | Comma-separated list of allowed production frontend domains |
| `AUTO_SEED_ON_EMPTY` | No | `false` | Auto-seed dummy records only if the database is completely empty on first boot |

### Frontend Environment Variables

| Variable Name | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://api.revenueai.app` | Public HTTPS URL of the deployed FastAPI backend |
| `VITE_GOOGLE_CLIENT_ID` | No | `123456...apps.googleusercontent.com` | Optional Google OAuth client ID (defaults to sandbox mode if omitted) |

---

## 4. Deployment Instructions

### Option 1: 1-Click Deployment on Render (Recommended)

The repository includes a ready-to-use `render.yaml` Blueprint that deploys Managed PostgreSQL, FastAPI backend, and React static frontend together.

1. Push your repository to GitHub / GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your repository and select `render.yaml`.
5. Provide your `AI_API_KEY` (Groq API Key) in the environment settings.
6. Click **Apply**. Render will automatically provision:
   - PostgreSQL 16 Database
   - Python 3.11 FastAPI Web Service (with Health Check `/health`)
   - React / Vite Static Site connected via HTTPS

---

### Option 2: Decoupled Deployment (Vercel Frontend + Render Backend + Neon PostgreSQL)

#### Step 1: Provision Managed PostgreSQL (Neon / Supabase)
1. Create a database instance on [Neon](https://neon.tech/) or [Supabase](https://supabase.com/).
2. Copy the PostgreSQL connection string (`postgresql://...`).

#### Step 2: Deploy Backend (Render / Railway)
1. Create a new Web Service pointing to the `/backend` directory.
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `python run.py`
4. Set Environment Variables:
   - `DATABASE_URL`: Your Neon/Supabase PostgreSQL connection string
   - `SECRET_KEY`: Random 64-character secret
   - `AI_PROVIDER`: `generic_llm`
   - `AI_API_KEY`: Your Groq API key
   - `AI_MODEL`: `openai/gpt-oss-120b`
   - `AI_BASE_URL`: `https://api.groq.com/openai/v1`
   - `PAYMENT_PROVIDER`: `mock`
   - `ALLOW_REAL_MONEY_MOVEMENT`: `false`
   - `CORS_ORIGINS`: `https://<your-vercel-app>.vercel.app`
5. Verify health:
   ```bash
   curl https://<your-backend-domain>/health
   # Response: {"status":"healthy","service":"RevenueAI","real_money_disabled":true,...}
   ```

#### Step 3: Deploy Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com/).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://<your-backend-domain>`
5. Deploy. Vercel will build the SPA and route all requests through HTTPS.

---

### Option 3: Containerized Deployment via Docker Compose

To deploy as a self-contained multi-container system on any VPS or Cloud VM (AWS EC2, GCP Compute Engine, DigitalOcean Droplet):

1. Clone the repository on the target server.
2. Create `.env` in the root directory:
   ```bash
   AI_API_KEY=<your-groq-api-key>
   SECRET_KEY=<your-jwt-secret>
   ```
3. Start the containers:
   ```bash
   docker compose up -d --build
   ```
4. Verify running services:
   ```bash
   docker compose ps
   ```

---

## 5. Database Initialization & Seeding

### Automatic First-Time Boot
On startup, FastAPI automatically runs `Base.metadata.create_all()` to ensure all tables exist:
- `users`
- `customers`
- `subscriptions`
- `payments`
- `recovery_cases`
- `agent_decisions`
- `recovery_actions`
- `audit_logs`
- `recovery_pressure_assessments`
- `recovery_fatigue_assessments`
- `notifications`

If no user exists, it automatically provisions the default administrator:
- **Email**: `demo@revenueai.app`
- **Password**: `RevenueAI@2026`

### Explicit Demo Dataset Generation
To populate or refresh synthetic fintech payment data, run either:

**Via CLI**:
```bash
python backend/app/seed.py
```

**Via Authenticated API**:
```bash
curl -X POST https://<your-backend-domain>/api/demo/seed \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"num_customers": 100, "num_payments": 300, "reset_existing": false}'
```

---

## 6. Local Development Instructions

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
Backend runs at `http://127.0.0.1:8000` (API documentation at `/docs`).

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 7. Verification & Smoke Testing

Run the automated test suites before and after redeployments:

```bash
# 1. Frontend Build Verification
cd frontend && npm run build

# 2. Architecture & Guardrail Hardening Tests
python backend/test_architecture_hardening.py

# 3. Recovery Pressure Suite
python backend/test_fatigue_suite.py

# 4. Cloud Readiness & API End-to-End Suite
python backend/test_cloud_readiness.py
```

---

## 8. Troubleshooting & Maintenance

| Symptom | Probable Cause | Resolution |
| :--- | :--- | :--- |
| `CORS error on API requests` | `CORS_ORIGINS` does not match the frontend domain | Add the exact frontend HTTPS URL to `CORS_ORIGINS` environment variable. |
| `NoSuchModuleError: postgres` | `DATABASE_URL` starts with `postgres://` | The backend auto-converts `postgres://` to `postgresql://`. Ensure latest `database.py` is deployed. |
| `AI Agent returns HEURISTIC_FALLBACK` | `AI_API_KEY` missing, expired, or rate-limited | Verify your Groq API key in the backend environment variables. |
| `Database data disappeared on restart` | Backend was using ephemeral SQLite rather than PostgreSQL | Set `DATABASE_URL` to a persistent managed PostgreSQL instance. |
| `SPA routes 404 on page refresh` | Web server missing SPA rewrite rule | Ensure `vercel.json`, `render.yaml`, or `nginx.conf` has rewrite to `index.html`. |

---

## 9. Security & Compliance Checklist

- [x] No secrets committed to repository (`.env` in `.gitignore`).
- [x] Passwords hashed using PBKDF2-HMAC-SHA256 with unique cryptographic salts (600,000 rounds).
- [x] JWT tokens signed with HS256 and verified with timing-attack resistance.
- [x] AI Agent operations strictly mediated by 7 deterministic guardrails.
- [x] Real-money movement hard-disabled (`ALLOW_REAL_MONEY_MOVEMENT=false`).
- [x] Full immutable audit log persisted for every decision and action.
