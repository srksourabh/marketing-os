from pathlib import Path
import json

from app.orchestration.chief_marketing_officer import ChiefMarketingOfficer
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_growth_cycle_persists_campaign_and_draft_queue(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    product = ProductDNAService(repo).onboard_product(
        {
            "name": "Vegan Silk",
            "category": "plant-based haircare",
            "problem": "frizzy hair without harsh chemicals",
            "audience": "women with dry curly hair in India",
            "differentiators": ["vegan", "silk-finish", "sulfate-free"],
            "channels": ["instagram", "email", "seo"],
            "goals": ["increase qualified leads", "improve conversion rate"],
            "proof_points": ["repeat customers", "before-after feedback"],
        }
    )

    result = ChiefMarketingOfficer(repo).run_growth_cycle(product.slug, objective="launch a 30-day growth sprint")

    campaign_path = tmp_path / "products" / product.slug / "campaigns" / "latest.json"
    queue_path = tmp_path / "products" / product.slug / "queue" / "drafts.json"

    assert campaign_path.exists()
    assert queue_path.exists()

    campaign_data = json.loads(campaign_path.read_text())
    queue_data = json.loads(queue_path.read_text())

    assert campaign_data["strategy"]["research_summary"]["market"]["channel_opportunities"]
    assert campaign_data["strategy"]["research_summary"]["customer"]["pain_points"]
    assert campaign_data["strategy"]["research_summary"]["competitor"]["competitors"]
    assert campaign_data["asset_pack"]["designer_brief"]["image_prompt"]
    assert campaign_data["asset_pack"]["cro_recommendations"]
    assert queue_data["approval_request_id"] == result.approval_request.request_id
    assert len(queue_data["items"]) >= 4
