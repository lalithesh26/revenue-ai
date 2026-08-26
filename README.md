# RevenueAI 🚀
> **AI Revenue Recovery & Decision Engine for Modern Fintech Platforms**

RevenueAI detects failed or at-risk subscription and checkout payments, analyzes deep customer and gateway context, recommends structured recovery strategies, strictly enforces pre-execution safety guardrails, executes simulated actions via an extensible payment provider layer, and maintains a transparent, tamper-evident audit trail.

---

## 1. What RevenueAI Does

When payment gateways decline subscription renewals or invoices (e.g. expired cards, bank outages, insufficient balance, OTP abandonment), simple dumb retries fail and cause customer churn. RevenueAI provides an intelligent, autonomous recovery loop:

* **Real-time Failure Detection**: Ingests failed transactions across Cards, UPI, Netbanking, and Auto-Debit Mandates.
* **Customer Context Synthesis**: Correlates payment failure reasons with subscriber Lifetime Value (LTV), past payment success rates, subscription plans, and communication consent.
* **Contextual AI Recommendations**: Selects optimal recovery actions (`retry`, `send_payment_link`, `send_reminder`, `wait`, `escalate`, `stop`) with confidence scoring and explainable rationale powered by Groq (`openai/gpt-oss-120b`).
* **Strict Safety Guardrail Engine**: Evaluates every proposed action against 6 deterministic rules before execution.
* **Extensible Provider Abstraction**: Routes simulated actions with zero real-money movement, pre-architected for a drop-in Razorpay Test Mode adapter.
* **Comprehensive Audit Trail**: Records every decision, check, execution, and outcome with timestamped JSON metadata.
* **Enterprise Auth & Governance**: PBKDF2-HMAC-SHA256 password hashing with signed JWT session authentication.

---

## 2. Architecture

```
Frontend (React 18 + TypeScript + Vite + Tailwind)
   │ (REST API with Authorization: Bearer <token>)
   ▼
FastAPI REST Layer (/api/auth, /api/dashboard, /api/recovery-cases, /api/payments, /api/customers, /api/notifications, /api/search, /api/demo)
   │
   ▼
Recovery Orchestration Layer (app.engine.orchestrator)
   ├── Context Collector (Customer LTV, Subscription, Past Ledger)
   ├── Recovery Agent (Groq openai/gpt-oss-120b + Heuristic Fallback)
   ├── Guardrail Engine (6 Deterministic Safety Policies)
   └── Audit Logger (Cryptographic event history)
   │
   ▼
Payment Provider Interface (PaymentProvider)
   ├── MockPaymentProvider (Simulated transactions, links, settlements)
   └── RazorpayTestModeProvider (Drop-in ready for rzp_test_ keys)
   │
   ▼
Database (PostgreSQL via SQLAlchemy ORM with automatic SQLite fallback)
```

---

## 3. How to Run Locally

### Option A: Direct Local Run (Recommended for Rapid Dev)

#### Prerequisites
* Python 3.10+ (Python 3.14 supported)
* Node.js 18+ and npm

#### 1. Backend Setup
```bash
# Navigate to backend and install requirements
cd backend
pip install -r requirements.txt

# Start backend server (runs on http://127.0.0.1:8000)
python run.py
```
*Note: If PostgreSQL is not running, the backend automatically initializes a local SQLite database (`recoverai.db`) and auto-seeds 100+ customers, 300+ payments, and the demo user.*

#### 2. Frontend Setup
```bash
# Navigate to frontend and install dependencies
cd ../frontend
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 4. Default Demo Credentials

| Field | Value |
| :--- | :--- |
| **Email** | `demo@revenueai.app` |
| **Password** | `RevenueAI@2026` |
| **Role** | `Fintech Administrator` |

*(Can also be customized via `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `.env`)*

---

## 5. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/recoverai` | PostgreSQL connection string (falls back to SQLite if unreachable) |
| `SECRET_KEY` | `revenueai-fintech-jwt-secret-key-2026-production-ready` | Cryptographic secret for signing JWT session tokens |
| `DEMO_USER_EMAIL` | `demo@revenueai.app` | Default seeded demo administrator email |
| `DEMO_USER_PASSWORD`| `RevenueAI@2026` | Default seeded demo administrator password |
| `MAX_RECOVERY_RETRIES` | `3` | Maximum automatic retries per recovery case |
| `ALLOW_REAL_MONEY_MOVEMENT`| `false` | Strictly false in prototype mode |
| `PAYMENT_PROVIDER` | `mock` | `mock` or `razorpay_test` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay Test Mode Key ID |
| `RAZORPAY_KEY_SECRET` | `...` | Razorpay Test Mode Key Secret |
| `AI_PROVIDER` | `generic_llm` | AI engine (`generic_llm`, `heuristic`, `gemini`, `openai`) |
| `AI_API_KEY` | `""` | Optional LLM API Key (Groq / OpenAI) |
| `AI_MODEL` | `openai/gpt-oss-120b` | Model name for Groq fast inference |

---

## 6. REST API Endpoints

### Authentication
* `POST /api/auth/login`: Authenticates user credentials & returns JWT bearer token.
* `POST /api/auth/logout`: Invalidates active session token.
* `GET /api/auth/me`: Returns authenticated user profile.
* `GET /api/auth/demo-credentials`: Returns developer demo email configuration.

### Search & Notifications
* `GET /api/search?q=...`: Universal search across Recovery Cases, Customers, and Payments.
* `GET /api/notifications`: Retrieves list of system notifications with unread counts.
* `POST /api/notifications/{id}/read`: Marks notification as read.
* `POST /api/notifications/read-all`: Marks all notifications as read.

### Dashboard & Analytics
* `GET /api/dashboard/summary`: High-level KPIs, failure reason breakdown, method efficiency, recent decisions & audits.

### Recovery Cases
* `GET /api/recovery-cases`: Filterable list of cases (status, priority, search).
* `GET /api/recovery-cases/{id}`: Detailed case view including customer metrics, subscription, decisions, actions, and audit logs.
* `POST /api/recovery-cases/{id}/analyze`: Triggers AI recovery strategy recommendation.
* `POST /api/recovery-cases/{id}/execute`: Evaluates guardrails and executes the recovery action.
* `POST /api/recovery-cases/{id}/run-agent`: Executes full 5-stage autonomous loop with model attribution.
* `GET /api/recovery-cases/{id}/audit`: Retrieves the full chronological audit trail.

### Payments & Customers
* `GET /api/payments`: Transaction ledger with status and gateway decline notes.
* `GET /api/payments/{id}`: Individual payment details.
* `GET /api/customers`: Customer directory with communication consent status.
* `GET /api/customers/{id}`: Customer profile with historical spend and payment success rate.

### Demo & Simulation
* `POST /api/demo/seed`: Re-seeds the synthetic dataset.
* `POST /api/demo/simulate-failure`: Generates a real-time failed payment and spins up a recovery case.
* `POST /api/demo/simulate-recovery`: Simulates customer completing a payment link / auto-debit capture.

---

## 7. Safety & Guardrail Design

RevenueAI follows a strict defense-in-depth safety architecture. The **GuardrailEngine** evaluates every action independently of the AI agent:

1. **Customer Consent Verification**: Halts all automated outreach and payment links if `consent_status == False`.
2. **Retry Velocity & Limit**: Strictly caps automated retries to 3 attempts, preventing gateway penalties or card testing flags.
3. **Idempotency & Settlement State Check**: Prevents duplicate charges if the case or payment is already `succeeded` or `recovered`.
4. **Payment Amount Immutability**: Guarantees the AI cannot alter the invoice total down to the paisa.
5. **Zero Hallucinated Discounts Policy**: Rejects any unverified discount codes or unauthorized fee deductions.
6. **Real-Money Isolation Barrier**: Enforces that all execution paths route strictly through simulated/test-mode endpoints.

---

## License & Disclaimer
Built as a prototype for the Fintech AI Buildathon. Contains only synthetic demo data and zero real-money movement.
