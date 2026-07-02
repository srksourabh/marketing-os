from __future__ import annotations

from app.models import Product


class SEOContentAgent:
    def build_brief(self, product: Product) -> dict:
        topic_root = product.category.replace("_", " ")
        return {
            "primary_keyword": f"best {topic_root} for {product.problem}",
            "secondary_keywords": [
                f"{product.name} alternatives",
                f"how to solve {product.problem}",
                f"{topic_root} buyer guide",
            ],
            "search_intent": "commercial investigation",
            "outline": [
                "Problem framing",
                "What most alternatives miss",
                "How to evaluate solutions",
                "Proof and case examples",
                "CTA and next step",
            ],
            "internal_link_targets": ["feature page", "pricing page", "demo or contact page"],
        }

    def build_blog_briefs(self, product: Product) -> list[dict[str, str]]:
        return [
            {
                "title": f"How to solve {product.problem} without adding more complexity",
                "angle": "problem-aware educational piece",
                "cta": "invite the reader to a demo, audit, or signup",
            },
            {
                "title": f"{product.name} vs common alternatives: what matters when buying {product.category}",
                "angle": "comparison content for high-intent buyers",
                "cta": "push into comparison page or sales conversation",
            },
        ]
