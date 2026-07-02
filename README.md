# Marketing OS

Brand-agnostic, draft-first marketing operating system with a Chief Marketing Officer orchestrator, specialist agents, QA gates, approvals, analytics, and reporting.

## What it does

Given a product name and either:
- a full structured payload, or
- just a brief description,

it creates a reusable marketing workspace and generates:
- product DNA artifacts
- GTM strategy
- channel priorities
- campaign plan
- SEO brief + blog briefs
- social post drafts
- lifecycle email sequence
- landing page/CRO recommendations
- analytics plan
- social posting plan
- execution backlog
- approval request
- draft queue
- cron manifest
- weekly reporting artifacts

## Core API

- `POST /products/onboard`
- `POST /products/{slug}/campaigns`
- `POST /products/{slug}/metrics/ingest`
- `GET /products/{slug}/reports/weekly/latest?week=YYYY-Www`
- `GET /products/{slug}/draft-queue`
- `GET /products/{slug}/cron-manifest`

## Minimal onboarding example

```json
{
  "name": "ClinicFlow",
  "brief_description": "CRM and automation software for small clinics to capture leads, send reminders, reduce no-shows, and grow patient bookings."
}
```

The system infers category, audience, business model, starter channels, goals, and baseline proof/claims scaffolding when those details are missing.

## Demo webpage

The app also serves a simple one-page Arjun demo at `/` with:
- product name field
- description field
- selectable marketing outputs
- same-page previews
- same-page download links
- downloadable content-generation prompt

Run locally:

```bash
uv run --with uvicorn python -m uvicorn app.main:app --host 127.0.0.1 --port 8008
```

## Render deployment

This repo now includes `requirements.txt` and `render.yaml` for Render.

Quick deploy on Render:
1. Push this folder to a GitHub repo.
2. In Render, choose **New +** → **Blueprint**.
3. Point it to the repo.
4. Render reads `render.yaml` and deploys the FastAPI app.
5. Open the generated public URL.

Start command used by Render:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
