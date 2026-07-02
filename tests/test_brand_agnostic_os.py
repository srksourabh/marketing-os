from pathlib import Path
import asyncio

import httpx

from app.main import app
from app.orchestration.chief_marketing_officer import ChiefMarketingOfficer
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


BRIEF_ONLY_PAYLOAD = {
    "name": "ClinicFlow",
    "brief_description": "CRM and automation software for small clinics to capture leads, send reminders, reduce no-shows, and grow patient bookings.",
}


def test_brief_only_onboarding_creates_brand_agnostic_workspace(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    product = ProductDNAService(repo).onboard_product(BRIEF_ONLY_PAYLOAD)

    product_dir = tmp_path / "products" / product.slug
    assert product.slug == "clinicflow"
    assert product.category
    assert product.channels
    assert (product_dir / "gtm_strategy.md").exists()
    assert (product_dir / "analytics_plan.md").exists()
    assert (product_dir / "social_posting_plan.md").exists()
    claims_text = (product_dir / "claims.yaml").read_text()
    assert "guaranteed results" in claims_text
    assert "plant-based" not in claims_text


def test_cmo_generates_complete_brand_agnostic_marketing_os(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    product = ProductDNAService(repo).onboard_product(BRIEF_ONLY_PAYLOAD)

    result = ChiefMarketingOfficer(repo).run_growth_cycle(product.slug, objective="create a scalable 90-day demand generation system")

    assert result.strategy.channel_priorities
    assert result.strategy.gtm_motion
    assert result.campaign_plan.funnel_stages
    assert result.asset_pack.blog_briefs
    assert result.asset_pack.analytics_plan["north_star_metric"]
    assert result.asset_pack.social_posting_plan["cadence"]
    assert result.asset_pack.content_backlog
    assert result.asset_pack.execution_backlog


def test_api_accepts_brief_only_payload_and_returns_full_marketing_outputs():
    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            onboard = await client.post("/products/onboard", json=BRIEF_ONLY_PAYLOAD)
            assert onboard.status_code == 200
            slug = onboard.json()["slug"]

            campaign = await client.post(
                f"/products/{slug}/campaigns",
                json={"objective": "create a scalable 90-day demand generation system"},
            )
            assert campaign.status_code == 200
            body = campaign.json()
            assert body["strategy"]["gtm_motion"]
            assert body["strategy"]["channel_priorities"]
            assert body["asset_pack"]["blog_briefs"]
            assert body["asset_pack"]["analytics_plan"]["north_star_metric"]
            assert body["asset_pack"]["social_posting_plan"]["cadence"]
            assert body["asset_pack"]["execution_backlog"]

    asyncio.run(_run())
