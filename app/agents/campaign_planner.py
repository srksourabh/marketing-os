from __future__ import annotations

from app.models import Product


class CampaignPlannerAgent:
    def plan(self, product: Product, objective: str) -> dict:
        return {
            "objective": objective,
            "calendar_weeks": 4,
            "channel_mix": product.channels,
            "weekly_focus": [
                "Week 1: positioning, offer, and high-intent hooks",
                "Week 2: proof assets and objection handling",
                "Week 3: funnel conversion and lifecycle nurture",
                "Week 4: performance review, iteration, and expansion",
            ],
            "experiments": [
                "Test proof-first vs pain-first landing page hero",
                "Test educational lead magnet vs case-study CTA",
                "Test social CTA that drives audit/demo vs content download",
            ],
            "funnel_stages": [
                {"stage": "awareness", "goal": "attract qualified attention", "owner": "research-seo + content-social"},
                {"stage": "consideration", "goal": "build trust and capture leads", "owner": "content-social + cro-lifecycle"},
                {"stage": "conversion", "goal": "turn demand into booked revenue", "owner": "cro-lifecycle"},
                {"stage": "retention", "goal": "increase repeat usage and referrals", "owner": "analytics-qa + lifecycle"},
            ],
            "conversion_goals": product.goals,
        }
