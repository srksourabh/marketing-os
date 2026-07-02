from pathlib import Path

from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_onboarding_creates_product_workspace(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    service = ProductDNAService(repo)

    product = service.onboard_product(
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

    product_dir = tmp_path / "products" / product.slug
    assert product.slug == "vegan-silk"
    assert product_dir.exists()
    assert (product_dir / "brief.md").exists()
    assert (product_dir / "brand_context.md").exists()
    assert (product_dir / "brand_voice.md").exists()
    assert (product_dir / "icp.md").exists()
    assert (product_dir / "claims.yaml").exists()
    assert (product_dir / "kpis.yaml").exists()
    assert product.messaging_pillars
