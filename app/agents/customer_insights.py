from __future__ import annotations

from app.models import Product


class CustomerInsightsAgent:
    def analyze(self, product: Product) -> dict:
        generic_objections = {
            "b2b_saas": [
                "Will this integrate with our current workflow?",
                "How quickly will the team adopt it?",
                "What ROI can we expect and how do we measure it?",
            ],
            "service_business": [
                "Will this actually reduce manual work?",
                "How hard is setup for a small team?",
                "How soon does this improve booked revenue?",
            ],
            "ecommerce": [
                "Why should I trust this over alternatives?",
                "Will this fit my exact use case?",
                "Is the quality worth the price?",
            ],
        }
        objections = generic_objections.get(
            product.business_model,
            [
                "Why switch from the current solution?",
                "Is this worth the time and budget?",
                "How fast will I see meaningful value?",
            ],
        )
        return {
            "pain_points": [
                product.problem,
                "wasted time from fragmented tools or unclear process",
                "risk of choosing an option that fails to deliver measurable value",
            ],
            "objections": objections,
            "motivations": [
                "confidence in the buying decision",
                "faster path to meaningful results",
                "clearer operational control and visibility",
            ],
        }
