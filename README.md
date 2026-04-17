# DesignLens — AI-Powered Design Review

DesignLens runs specialized AI agents to critique UI designs against a PRD and to generate dev-ready UI specs from scratch. Paste a PRD, upload screenshots, and get structured feedback on visual hierarchy, usability, and copy, plus a pass/fail checklist.

## Quick Start (local dev)

### 1. Set up Supabase

Create a free project at [supabase.com](https://supabase.com). Then:

- **Authentication → Providers**: enable **Email**, turn on **Magic Link**, disable email+password.
- **Authentication → URL Configuration → Redirect URLs**: add `http://localhost:5173` (and later your Render URL).
- **SQL Editor**: run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).
- **Project Settings → API**: copy the `URL`, `anon` key, and `service_role` key.

### 2. Configure env vars

```bash
cp .env.example .env
# Open .env and fill in:
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# VITE_SUPABASE_URL (same value), VITE_SUPABASE_ANON_KEY (same value)
# MASTER_KEY=$(openssl rand -base64 32)
```

The server reads from `./.env`; the Vite client reads `VITE_*` from the same file.

### 3. Install & run

```bash
cd server && npm install && npm start        # port 3001
cd client && npm install && npm run dev      # port 5173
```

Open <http://localhost:5173>, sign in via magic link, paste your OpenAI or Anthropic key in Settings, and run a review.

## How it works

1. **Auth**: Supabase magic-link sign-in. The browser holds only a short-lived JWT.
2. **Keys**: the user pastes their OpenAI or Anthropic API key once. The server encrypts it with AES-256-GCM using `MASTER_KEY` and stores the ciphertext in Supabase. The raw key never returns to the browser.
3. **Review**: upload screenshots → four agents analyze them sequentially (visual hierarchy → UX compliance → copy review → checklist). Results stream via Server-Sent Events.
4. **Generate**: paste a PRD → three agents produce a component tree, write all copy, and render a Tailwind HTML reference.

Each request decrypts the user's key in server memory, calls OpenAI or Anthropic, then discards it. No raw key is ever logged.

## Tech stack

- **Frontend**: React + Vite + Tailwind CSS v4 + Lucide icons + Supabase JS
- **Backend**: Express.js with SSE streaming + Supabase service_role client
- **AI**: OpenAI (GPT-4o) or Anthropic (Claude Sonnet 4.6) — user picks per account

## Deploy to Render (free tier)

A blueprint is in [render.yaml](render.yaml):

1. Push the repo to GitHub.
2. Set up Supabase as above. Add your Render URL (`https://<app>.onrender.com`) to **Redirect URLs**.
3. In Render, **New → Blueprint**, point at the repo.
4. When prompted, set env vars (Supabase URL + both keys + `MASTER_KEY` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). `SUPABASE_SERVICE_ROLE_KEY` and `MASTER_KEY` must be marked as secrets.
5. First build takes ~3–5 min.

The free plan spins down after 15 min of inactivity; the next request wakes it in ~30s.

## Operational notes

- **Rotate `MASTER_KEY`**: generate a new one, update the Render env, redeploy. Existing ciphertexts will no longer decrypt and affected users will be asked to re-paste their API keys. There is no re-encryption tool by design — rotation events should be rare and explicit.
- **Supabase outage** blocks login and key lookup; the app will return 401/500. Acceptable for an internal tool.
- **Never log `req.body`** on the server — it may contain user-provided data. The header-middleware block in [server/index.js](server/index.js) carries a comment enforcing this.
