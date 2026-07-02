# Architecture

## Current shape

The repo has two execution paths:

1. **Cloudflare Worker (`cloudflare/`)**
   - primary public product
   - serves the frontend
   - generates deliverables
   - packages assets and downloads

2. **FastAPI app (`app/`)**
   - earlier implementation
   - useful for local testing and modular Python orchestration
   - retained as a validation harness and reference implementation

## Worker flow

```text
Browser UI
  ↓
POST /experience
  ↓
Input normalization
  ↓
Product inference
  ↓
Analysis-first dependency expansion
  ↓
Research generation
    ├─ market research
    ├─ competitor intelligence
    └─ customer insights
  ↓
Brand system generation
  ↓
Asset generation
    ├─ logo SVG/icon
    ├─ AI image prompts
    ├─ social variants
    └─ moodboard / concept visuals
  ↓
Document packaging
    ├─ doc/html/pdf-ready outputs
    ├─ master board pack
    └─ ZIP bundle
```

## Why the analysis-first rule matters

Earlier-stage research should constrain downstream brand and creative output.
Without this, the system can generate polished nonsense faster than it generates useful strategy.

So the Worker now auto-adds these dependencies:

- `brand_identity_suite` requires:
  - `market_research`
  - `competitor_intel`
  - `customer_insights`
- `logo_pack` additionally requires:
  - `brand_identity_suite`
- `social_posts` additionally requires:
  - `logo_pack`

## Repo boundaries

### `cloudflare/`
Use this when you want to:
- iterate on the public product
- improve the UI
- change export packaging
- modify live brand/research/creative generation behavior

### `app/`
Use this when you want to:
- test Python-side orchestration ideas
- evolve the FastAPI prototype
- run API-level regression tests without depending on Worker deploys

## Technical debt worth paying down

1. Split the Worker into smaller modules instead of one large `worker.js`
2. Add retrieval-backed research instead of relying mostly on heuristic/category synthesis
3. Separate brand logic from presentation/export logic
4. Store generated artifacts in object storage rather than embedding all binaries directly in responses
5. Add CI for both Python tests and Worker syntax/deploy checks
