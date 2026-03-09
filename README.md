# DesignLens — AI-Powered Design Review

DesignLens runs 5 specialized AI agents to critique your UI designs against PRD requirements. Paste a PRD, upload screenshots, and get structured feedback on visual hierarchy, usability, copy, and a pass/fail checklist.

## Quick Start

### 1. Set up your API key

```bash
cp .env.example server/.env
```

Edit `server/.env` and add your OpenAI API key.

### 2. Install & run the backend

```bash
cd server
npm install
npm start
```

The server runs on http://localhost:3001.

### 3. Install & run the frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The app opens at http://localhost:5173.

## How It Works

1. **Paste PRD** — The PRD Parser agent extracts requirements, edge cases, and success metrics.
2. **Upload screenshots** — Design files are sent as base64 images to OpenAI's vision API.
3. **5 agents run sequentially** — Each agent builds on the previous one's findings:
   - PRD Parser → Visual Hierarchy Analyst → UX Compliance Checker → Copy Reviewer → Checklist Generator
4. **View results** — Structured critique with severity ratings, copy suggestions table, and a pass/fail checklist.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4 + Lucide icons
- **Backend**: Express.js with Server-Sent Events (SSE)
- **AI**: OpenAI
