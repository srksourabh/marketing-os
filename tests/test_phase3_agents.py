from pathlib import Path

from app.agents.campaign_planner import CampaignPlannerAgent
from app.agents.cro_funnel import CROFunnelAgent
from app.agents.designer import DesignerAgent
from app.agents.email_lifecycle import EmailLifecycleAgent
from app.agents.seo_content import SEOContentAgent
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_phase3_specialist_agents_expand_outputs(tmp_path: Path):
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

    planner = CampaignPlannerAgent().plan(product, objective="launch a 30-day growth sprint")
    seo = SEOContentAgent().build_brief(product)
    cro = CROFunnelAgent().analyze(product)
    email = EmailLifecycleAgent().build_sequence(product)
    designer = DesignerAgent().build_brief(product)

    assert planner["calendar_weeks"] == 4
    assert planner["weekly_focus"]
    assert seo["primary_keyword"]
    assert seo["outline"]
    assert cro["experiments"]
    assert email["sequence"]
    assert designer["image_prompt"]
