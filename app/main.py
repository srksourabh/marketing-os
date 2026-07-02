from __future__ import annotations

import json
import re
from pathlib import Path
from tempfile import gettempdir
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

from app.analytics import AnalyticsService, ReportingService
from app.orchestration.chief_marketing_officer import ChiefMarketingOfficer
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository

repo = ProductRepository(Path(gettempdir()) / "marketing_os_api_workspace")
app = FastAPI(title="Marketing OS")

BASE_DIR = Path(__file__).resolve().parent
INDEX_HTML = BASE_DIR / "static" / "index.html"

DELIVERABLE_OPTIONS = [
    {"id": "product_summary", "label": "Product summary"},
    {"id": "brand_context", "label": "Brand context"},
    {"id": "brand_voice", "label": "Brand voice"},
    {"id": "icp", "label": "Ideal customer profile"},
    {"id": "market_research", "label": "Market research"},
    {"id": "customer_insights", "label": "Customer insights"},
    {"id": "competitor_intel", "label": "Competitor intelligence"},
    {"id": "gtm_strategy", "label": "Go-to-market strategy"},
    {"id": "channel_priorities", "label": "Channel priorities"},
    {"id": "campaign_plan", "label": "Campaign plan"},
    {"id": "seo_brief", "label": "SEO brief"},
    {"id": "blog_briefs", "label": "Blog briefs"},
    {"id": "social_posts", "label": "Social content"},
    {"id": "email_sequence", "label": "Email sequence"},
    {"id": "landing_page_copy", "label": "Landing page copy"},
    {"id": "cro_recommendations", "label": "CRO recommendations"},
    {"id": "analytics_plan", "label": "Analytics plan"},
    {"id": "social_posting_plan", "label": "Social posting plan"},
    {"id": "content_backlog", "label": "Content backlog"},
    {"id": "execution_backlog", "label": "Execution backlog"},
    {"id": "draft_queue", "label": "Draft queue"},
    {"id": "cron_manifest", "label": "Operating rhythm / cron manifest"},
    {"id": "content_gen_prompt", "label": "Content generation prompt"},
]
OPTION_INDEX = {item["id"]: item["label"] for item in DELIVERABLE_OPTIONS}


class ProductOnboardRequest(BaseModel):
    name: str
    brief_description: str = ""
    category: str | None = None
    problem: str | None = None
    audience: str | None = None
    differentiators: list[str] = []
    channels: list[str] = []
    goals: list[str] = []
    proof_points: list[str] = []
    business_model: str | None = None


class CampaignRequest(BaseModel):
    objective: str


class MetricsRequest(BaseModel):
    week: str
    metrics: dict[str, Any]


class ExperienceRequest(BaseModel):
    name: str
    description: str
    selected_items: list[str] = Field(default_factory=list)
    objective: str = "Generate a complete marketing analysis and content draft pack"


@app.get("/", response_class=HTMLResponse)
def home():
    return FileResponse(INDEX_HTML)


@app.get("/deliverables")
def deliverables():
    return {"items": DELIVERABLE_OPTIONS}


@app.post("/products/onboard")
def onboard_product(payload: ProductOnboardRequest):
    product = ProductDNAService(repo).onboard_product(payload.model_dump())
    return product.to_dict()


@app.post("/products/{slug}/campaigns")
def generate_campaign(slug: str, payload: CampaignRequest):
    result = ChiefMarketingOfficer(repo).run_growth_cycle(slug, objective=payload.objective)
    return {
        "product": result.product.to_dict(),
        "strategy": result.strategy.__dict__,
        "opportunities": result.opportunities,
        "campaign_plan": result.campaign_plan.__dict__,
        "asset_pack": result.asset_pack.__dict__,
        "qa_report": result.qa_report.__dict__,
        "approval_request": result.approval_request.__dict__,
    }


@app.post("/experience")
def generate_experience(payload: ExperienceRequest):
    if not payload.selected_items:
        raise HTTPException(status_code=400, detail="Select at least one deliverable.")

    invalid = [item for item in payload.selected_items if item not in OPTION_INDEX]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown deliverables: {', '.join(invalid)}")

    product = ProductDNAService(repo).onboard_product(
        {
            "name": payload.name,
            "brief_description": payload.description,
        }
    )
    result = ChiefMarketingOfficer(repo).run_growth_cycle(product.slug, objective=payload.objective)
    deliverable_map = _build_deliverable_map(product.slug, product.to_dict(), result)
    product_dir = repo.product_dir(product.slug)
    downloads_dir = product_dir / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    selected_outputs = []
    for item_id in payload.selected_items:
        artifact = deliverable_map[item_id]
        filename = f"{_slugify(item_id)}.{artifact['extension']}"
        file_path = downloads_dir / filename
        file_path.write_text(artifact["content"], encoding="utf-8")
        selected_outputs.append(
            {
                "id": item_id,
                "label": OPTION_INDEX[item_id],
                "preview": artifact["preview"],
                "download_url": f"/products/{product.slug}/downloads/{filename}",
                "format": artifact["extension"],
            }
        )

    return {
        "slug": product.slug,
        "product_name": product.name,
        "product_dir": str(product_dir),
        "selected_outputs": selected_outputs,
    }


@app.get("/products/{slug}/downloads/{filename}")
def download_artifact(slug: str, filename: str):
    path = repo.product_dir(slug) / "downloads" / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Download not found")
    return FileResponse(path, filename=filename)


@app.post("/products/{slug}/metrics/ingest")
def ingest_metrics(slug: str, payload: MetricsRequest):
    AnalyticsService(repo).record_snapshot(slug, week=payload.week, metrics=payload.metrics)
    return {"ok": True, "slug": slug, "week": payload.week}


@app.get("/products/{slug}/reports/weekly/latest")
def latest_report(slug: str, week: str):
    report = ReportingService(repo).build_weekly_report(slug, week=week)
    return {
        "markdown_path": str(report.markdown_path),
        "json_path": str(report.json_path),
        "chart_paths": [str(p) for p in report.chart_paths],
    }


@app.get("/products/{slug}/draft-queue")
def draft_queue(slug: str):
    return repo.read_nested_json(slug, "queue/drafts.json")


@app.get("/products/{slug}/cron-manifest")
def cron_manifest(slug: str):
    return {"content": repo.read_nested_text(slug, "ops/cron-manifest.md")}


def _build_deliverable_map(slug: str, product: dict[str, Any], result: Any) -> dict[str, dict[str, str]]:
    asset_pack = result.asset_pack.__dict__
    strategy = result.strategy.__dict__
    campaign_plan = result.campaign_plan.__dict__
    draft_queue_data = repo.read_nested_json(slug, "queue/drafts.json")
    cron_manifest_text = repo.read_nested_text(slug, "ops/cron-manifest.md")
    research_summary = repo.read_nested_json(slug, "campaigns/latest.json")["strategy"].get("research_summary", {})

    brand_context = (
        f"{product['name']} is positioned as a {product['category']} offer for {product['audience']}. "
        f"It focuses on solving {product['problem']}. Core differentiators: {', '.join(product['differentiators'])}."
    )
    icp = (
        f"Audience: {product['audience']}\n"
        f"Problem: {product['problem']}\n"
        f"Goals: {', '.join(product['goals'])}\n"
        f"Preferred channels: {', '.join(product['channels'])}"
    )
    product_summary = (
        f"Product: {product['name']}\n"
        f"Description: {product['brief_description']}\n"
        f"Category: {product['category']}\n"
        f"Business model: {product['business_model']}\n"
        f"Messaging pillars:\n- " + "\n- ".join(product['messaging_pillars'])
    )
    content_prompt = _build_content_prompt(product, strategy, asset_pack)

    deliverables = {
        "product_summary": _text_artifact(product_summary),
        "brand_context": _text_artifact(brand_context),
        "brand_voice": _text_artifact("Brand voice:\n- " + "\n- ".join(product["brand_voice"])),
        "icp": _text_artifact(icp),
        "market_research": _json_artifact(research_summary.get("market", {})),
        "customer_insights": _json_artifact(research_summary.get("customer", {})),
        "competitor_intel": _json_artifact(research_summary.get("competitor", {})),
        "gtm_strategy": _json_artifact({
            "positioning_statement": strategy["positioning_statement"],
            "value_props": strategy["value_props"],
            "campaign_themes": strategy["campaign_themes"],
            "opportunities": strategy["opportunities"],
            "gtm_motion": strategy["gtm_motion"],
            "funnel_summary": strategy["funnel_summary"],
        }),
        "channel_priorities": _json_artifact(strategy["channel_priorities"]),
        "campaign_plan": _json_artifact(campaign_plan),
        "seo_brief": _json_artifact(asset_pack["seo_brief"]),
        "blog_briefs": _json_artifact(asset_pack["blog_briefs"]),
        "social_posts": _json_artifact(asset_pack["social_posts"]),
        "email_sequence": _json_artifact(asset_pack["email_sequence"]),
        "landing_page_copy": _json_artifact(asset_pack["landing_page_sections"]),
        "cro_recommendations": _json_artifact(asset_pack["cro_recommendations"]),
        "analytics_plan": _json_artifact(asset_pack["analytics_plan"]),
        "social_posting_plan": _json_artifact(asset_pack["social_posting_plan"]),
        "content_backlog": _json_artifact(asset_pack["content_backlog"]),
        "execution_backlog": _json_artifact(asset_pack["execution_backlog"]),
        "draft_queue": _json_artifact(draft_queue_data),
        "cron_manifest": _text_artifact(cron_manifest_text),
        "content_gen_prompt": _text_artifact(content_prompt),
    }
    return deliverables


def _text_artifact(content: str) -> dict[str, str]:
    return {
        "content": content.strip() + "\n",
        "preview": content.strip()[:220],
        "extension": "txt",
    }


def _json_artifact(data: Any) -> dict[str, str]:
    content = json.dumps(data, indent=2)
    return {
        "content": content + "\n",
        "preview": content[:220],
        "extension": "json",
    }


def _build_content_prompt(product: dict[str, Any], strategy: dict[str, Any], asset_pack: dict[str, Any]) -> str:
    return f"""Create marketing content for {product['name']}.

Product summary:
- Category: {product['category']}
- Audience: {product['audience']}
- Problem solved: {product['problem']}
- Business model: {product['business_model']}
- Messaging pillars: {', '.join(product['messaging_pillars'])}
- Brand voice: {', '.join(product['brand_voice'])}

Go-to-market strategy:
- Positioning: {strategy['positioning_statement']}
- GTM motion: {strategy['gtm_motion']}
- Campaign themes: {', '.join(strategy['campaign_themes'])}
- Opportunities: {', '.join(strategy['opportunities'])}

Content requirements:
- Create channel-native assets for: {', '.join(product['channels'])}
- Social posting cadence: {asset_pack['social_posting_plan']['cadence']}
- Primary CTA style: clear, specific, low-hype
- Proof points to reference: {', '.join(product['proof_points'])}

Output requested:
1. Three fresh social posts
2. One short landing page hero variation
3. One email draft
4. One blog or SEO angle
5. One CTA recommendation

Keep the tone premium, credible, and conversion-aware. Avoid generic hype and vague claims."""


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
