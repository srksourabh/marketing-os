# Marketing OS Final Delivery Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten Marketing OS into a credible final-delivery product by fixing first-impression UX, removing naming/copy regressions, reducing output-selection overload, hardening delivery/download flow language, and verifying the public Worker end-to-end.

**Architecture:** Keep the current Cloudflare Worker architecture intact. Make focused product-surface changes in `cloudflare/public/index.html`, keep deliverable semantics aligned in `cloudflare/src/config.js`, and correct outward-facing provider metadata in `cloudflare/src/llm-client.js`. Do not restructure orchestration unless a live verification failure forces it.

**Tech Stack:** Cloudflare Workers, static HTML/CSS/JS frontend, vanilla JS orchestration, git, wrangler.

## Global Constraints

- Keep scope limited to final-delivery quality and release blockers.
- Do not re-architect the DAG unless verification proves a blocker.
- Preserve BYOK behavior and dependency auto-add logic.
- Founder-grade copy only; no debug-ish, template-ish, or theatrical phrasing.
- Verification must include fresh syntax checks, deploy, and public live checks before claiming success.

---

## File Structure

- Modify: `cloudflare/public/index.html` — landing copy, first-run UX, output-selection defaults/grouping language, status messages.
- Modify: `cloudflare/src/config.js` — deliverable labels/order if needed to match final-delivery UX.
- Modify: `cloudflare/src/llm-client.js` — outward-facing product name in provider metadata.
- Optionally modify: `cloudflare/src/assets.js` and `cloudflare/src/deliverables.js` only if live verification shows remaining founder-grade copy failures in generated artifacts.

### Task 1: Fix product-surface naming and hero credibility

**Files:**
- Modify: `cloudflare/public/index.html`
- Modify: `cloudflare/src/llm-client.js`

**Interfaces:**
- Consumes: current public marketing copy and OpenRouter request metadata.
- Produces: corrected app title/eyebrow/hero/status strings and consistent external product naming.

- [ ] Replace `Orzun` branding remnants with `Arjun Marketing OS`.
- [ ] Replace `board-ready growth pack` and `raw JSON sludge` language with founder-grade wording.
- [ ] Remove `What this version changes` framing if it reads like an internal build note rather than a product promise.
- [ ] Update OpenRouter `X-Title` metadata to match the product name.

### Task 2: Reduce output-selection overload without breaking capability

**Files:**
- Modify: `cloudflare/public/index.html`
- Modify: `cloudflare/src/config.js` (if label/order changes are needed)

**Interfaces:**
- Consumes: current deliverable option list and dependency map.
- Produces: clearer selection UX while preserving access to full output set.

- [ ] Make the first-run selection experience feel curated rather than exposing the full internal control panel by default.
- [ ] Keep core packaged outputs prominent: CEO report, brand identity, logo pack, social content, master board pack, ZIP bundle.
- [ ] Preserve advanced/internal node access only if still needed, but visually demote it.
- [ ] Ensure default checked items align with a real final-delivery use case, not a debug sweep.

### Task 3: Tighten run-state and delivery language

**Files:**
- Modify: `cloudflare/public/index.html`

**Interfaces:**
- Consumes: current status strings and runtime hints.
- Produces: professional generation/progress/download language.

- [ ] Rewrite BYOK hints and runtime status text to sound product-grade.
- [ ] Make master pack / ZIP behavior legible to end users.
- [ ] Keep failure and success messages explicit and useful.

### Task 4: Verify and only then widen scope if live output still feels weak

**Files:**
- Optional modify: `cloudflare/src/assets.js`
- Optional modify: `cloudflare/src/deliverables.js`

**Interfaces:**
- Consumes: live generated output from `/experience`.
- Produces: final artifact copy cleanup only if still needed after surface fixes.

- [ ] Run a live public check after deploy.
- [ ] Inspect generated output headings/snippets/download behavior.
- [ ] Only patch backend artifact copy if public output still smells templated.

### Task 5: Release verification

**Files:**
- Modify: repo working tree only as needed.

**Interfaces:**
- Consumes: local source tree and public Worker.
- Produces: evidence-backed completion status.

- [ ] Run syntax checks on touched JS files.
- [ ] Deploy via `npx wrangler deploy` from `cloudflare/`.
- [ ] Verify the public homepage visually/textually.
- [ ] Run a fresh public live generation request and inspect response shape/output evidence.
- [ ] Commit and push only after verification.

## Verification Commands

```bash
cd /opt/data/marketing-os/cloudflare/src && node -c config.js && node -c llm-client.js
cd /opt/data/marketing-os/cloudflare && npx wrangler deploy
```

Public checks:

```bash
# homepage inspection via browser tools
# live generation via HTTPS request to /experience using a valid BYOK key if required
```

## Expected Outcome

- The live app no longer exposes `Orzun` naming.
- The landing page reads like a product ready to share.
- Output selection is more curated and less overwhelming.
- Delivery/status/download language feels deliberate and founder-grade.
- Public verification evidence exists for the shipped state.
