from pathlib import Path

from app.analytics import AnalyticsService, ReportingService
from app.services.product_dna_service import ProductDNAService
from app.storage import ProductRepository


def test_reporting_generates_markdown_json_and_svg(tmp_path: Path):
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

    analytics = AnalyticsService(repo)
    analytics.record_snapshot(product.slug, week="2026-W27", metrics={"traffic": 1200, "leads": 80, "revenue": 50000, "conversion_rate": 0.032})
    analytics.record_snapshot(product.slug, week="2026-W28", metrics={"traffic": 1450, "leads": 104, "revenue": 68000, "conversion_rate": 0.041})

    report = ReportingService(repo).build_weekly_report(product.slug, week="2026-W28")

    assert report.markdown_path.exists()
    assert report.json_path.exists()
    assert report.chart_paths
    assert all(path.exists() for path in report.chart_paths)
    assert "Week-over-week" in report.markdown_path.read_text()
