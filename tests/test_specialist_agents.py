from pathlib import Path

from app.agents.market_research import MarketResearchAgent
from app.agents.competitor_intel import CompetitorIntelAgent
from app.agents.customer_insights import CustomerInsightsAgent
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_specialist_agents_generate_structured_outputs(tmp_path: Path):
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

    market = MarketResearchAgent().analyze(product)
    competitor = CompetitorIntelAgent().analyze(product)
    insights = CustomerInsightsAgent().analyze(product)

    assert len(market["channel_opportunities"]) >= 2
    assert market["whitespace"]
    assert len(competitor["competitors"]) >= 2
    assert competitor["differentiation_angles"]
    assert insights["pain_points"]
    assert insights["objections"]
