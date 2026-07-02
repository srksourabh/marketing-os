from __future__ import annotations

from app.models import Product


class MarketResearchAgent:
    def analyze(self, product: Product) -> dict:
        social_channel = next((channel for channel in product.channels if channel not in {"seo", "email"}), "social")
        return {
            "channel_opportunities": [
                f"Use {social_channel} for pain-point education and proof snippets",
                "Capture high-intent search demand with comparison and implementation content",
                "Build lifecycle email flows that convert evaluators into ready buyers",
            ],
            "whitespace": [
                f"Most {product.category} competitors over-explain features and under-explain outcomes",
                "Own the trust gap with specific proof, process clarity, and objection handling",
            ],
            "trend_summary": [
                "trust-first educational content",
                "short-form proof assets that ladder into conversion pages",
                "clear attribution between content, lead capture, and revenue",
            ],
        }
