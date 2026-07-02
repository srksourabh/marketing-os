from pathlib import Path

from app.orchestration.chief_marketing_officer import ChiefMarketingOfficer
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_cmo_generates_strategy_and_campaign_pack(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    dna = ProductDNAService(repo)
    product = dna.onboard_product(
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

    cmo = ChiefMarketingOfficer(repo)
    result = cmo.run_growth_cycle(product.slug, objective="launch a 30-day growth sprint")

    assert result.product.slug == "vegan-silk"
    assert result.strategy.positioning_statement
    assert len(result.opportunities) >= 3
    assert result.campaign_plan.calendar_weeks == 4
    assert result.asset_pack.social_posts
    assert result.asset_pack.email_sequence
    assert result.qa_report.publish_readiness in {"pass", "revise"}
    assert result.approval_request.risk_level == "medium"
