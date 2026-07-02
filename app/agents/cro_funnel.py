from __future__ import annotations

from app.models import Product


class CROFunnelAgent:
    def analyze(self, product: Product) -> dict:
        return {
            "friction_points": [
                "unclear value proposition above the fold",
                "proof and objection handling appear too late",
                "CTA path does not match buyer intent stage",
            ],
            "experiments": [
                {"name": "proof-first hero", "impact": "high", "effort": "medium"},
                {"name": "intent-matched CTA path", "impact": "high", "effort": "medium"},
                {"name": "objection FAQ block", "impact": "medium", "effort": "low"},
            ],
        }
