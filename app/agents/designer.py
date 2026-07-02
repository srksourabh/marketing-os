from __future__ import annotations

from app.models import Product


class DesignerAgent:
    def build_brief(self, product: Product) -> dict:
        creative_direction = {
            "b2b_saas": "clean UI-led visuals with workflow diagrams and outcome callouts",
            "service_business": "trust-first visuals with before/after process clarity and human credibility",
            "ecommerce": "product-first visuals with proof, texture, and use-case context",
            "education": "authority-led visuals with curriculum or framework snapshots",
        }.get(product.business_model, "clean proof-led visuals with a clear CTA")
        return {
            "creative_direction": creative_direction,
            "image_prompt": (
                f"Create a campaign visual for {product.name}, a {product.category} offering for {product.audience}. "
                f"Emphasize {product.problem}, show a trust-first story, and match a modern premium brand system."
            ),
            "formats": ["website hero", "1080x1350 social post", "email hero"],
        }
