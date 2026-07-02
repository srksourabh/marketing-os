from __future__ import annotations

from app.models import Product


class CompetitorIntelAgent:
    def analyze(self, product: Product) -> dict:
        return {
            "competitors": [
                {"name": f"Incumbent {product.category} platform", "theme": "breadth and familiarity", "gap": "generic positioning"},
                {"name": f"Niche {product.category} challenger", "theme": "single-angle specialization", "gap": "thin proof and weak funnel"},
            ],
            "differentiation_angles": [
                f"Outcome-led positioning for {product.audience}",
                "Specific proof over vague feature lists",
                "Faster time-to-value with guided activation",
            ],
        }
