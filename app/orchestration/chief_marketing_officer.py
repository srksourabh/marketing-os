from __future__ import annotations

from dataclasses import asdict

from app.agents.campaign_planner import CampaignPlannerAgent
from app.agents.competitor_intel import CompetitorIntelAgent
from app.agents.cro_funnel import CROFunnelAgent
from app.agents.customer_insights import CustomerInsightsAgent
from app.agents.designer import DesignerAgent
from app.agents.email_lifecycle import EmailLifecycleAgent
from app.agents.market_research import MarketResearchAgent
from app.agents.seo_content import SEOContentAgent
from app.approvals import ApprovalRequest, ApprovalService
from app.models import AssetPack, CampaignPlan, GrowthCycleResult, QAReport, Strategy
from app.storage import ProductRepository


class ChiefMarketingOfficer:
    def __init__(self, repo: ProductRepository):
        self.repo = repo
        self.approvals = ApprovalService(repo)
        self.market_research = MarketResearchAgent()
        self.customer_insights = CustomerInsightsAgent()
        self.competitor_intel = CompetitorIntelAgent()
        self.campaign_planner = CampaignPlannerAgent()
        self.seo_content = SEOContentAgent()
        self.cro_funnel = CROFunnelAgent()
        self.email_lifecycle = EmailLifecycleAgent()
        self.designer = DesignerAgent()

    def run_growth_cycle(self, product_slug: str, objective: str) -> GrowthCycleResult:
        product = self.repo.load_product(product_slug)
        market = self.market_research.analyze(product)
        customer = self.customer_insights.analyze(product)
        competitor = self.competitor_intel.analyze(product)
        planner = self.campaign_planner.plan(product, objective=objective)
        seo_brief = self.seo_content.build_brief(product)
        blog_briefs = self.seo_content.build_blog_briefs(product)
        cro = self.cro_funnel.analyze(product)
        email = self.email_lifecycle.build_sequence(product)
        designer_brief = self.designer.build_brief(product)
        opportunities = self._opportunities(product, market, customer, competitor, cro)
        channel_priorities = self._channel_priorities(product)
        strategy = Strategy(
            positioning_statement=(
                f"{product.name} is the {product.category} option for {product.audience} "
                f"who need {product.problem} solved with less risk and more proof."
            ),
            value_props=product.messaging_pillars,
            campaign_themes=[
                "pain-point education",
                "proof-led differentiation",
                "conversion-focused activation",
            ],
            opportunities=opportunities,
            gtm_motion=self._gtm_motion(product),
            funnel_summary=[
                "Acquire demand through search, social, and authority assets",
                "Capture demand with lead magnets, demos, or signup CTAs",
                "Convert with proof, objection handling, and tight lifecycle follow-up",
                "Retain with reporting, adoption nudges, and expansion hooks",
            ],
            channel_priorities=channel_priorities,
        )
        campaign_plan = CampaignPlan(
            objective=planner["objective"],
            calendar_weeks=planner["calendar_weeks"],
            channel_mix=planner["channel_mix"],
            experiments=planner["experiments"],
            funnel_stages=planner["funnel_stages"],
            conversion_goals=planner["conversion_goals"],
        )
        social_channel = next((channel for channel in product.channels if channel not in {"seo", "email"}), "social")
        asset_pack = AssetPack(
            social_posts=[
                {
                    "id": "social-1",
                    "channel": social_channel,
                    "hook": f"Still dealing with {product.problem}?",
                    "caption": f"{product.name} helps {product.audience} move faster with a clearer system and proof-backed messaging.",
                    "cta": "Reply if you want the audit or next-step guide.",
                },
                {
                    "id": "social-2",
                    "channel": social_channel,
                    "hook": f"Why most {product.category} buyers stall before they convert",
                    "caption": "The gap is usually trust, proof, and a CTA that matches buyer intent. Fix those first.",
                    "cta": "Save this and review your funnel against it.",
                },
                {
                    "id": "social-3",
                    "channel": social_channel,
                    "hook": f"What makes {product.name} different?",
                    "caption": f"Three angles: {', '.join(product.differentiators[:3])}. Translate them into customer outcomes, not feature soup.",
                    "cta": "Click through for the full breakdown.",
                },
            ],
            email_sequence=email["sequence"],
            seo_brief=seo_brief,
            blog_briefs=blog_briefs,
            landing_page_sections=[
                {"title": "Hero", "copy": f"Solve {product.problem} with a clearer path to value for {product.audience}."},
                {"title": "Proof", "copy": f"Show evidence around {', '.join(product.proof_points[:2])}."},
                {"title": "Objections", "copy": "; ".join(customer["objections"][:2])},
                {"title": "CTA", "copy": self._primary_cta(product)},
            ],
            designer_brief=designer_brief,
            cro_recommendations=cro["experiments"],
            analytics_plan={
                "north_star_metric": self._north_star_metric(product),
                "funnel_metrics": ["traffic", "lead_rate", "qualified_rate", "conversion_rate", "revenue"],
                "dashboard_views": ["channel performance", "campaign attribution", "funnel conversion", "content ROI"],
            },
            social_posting_plan={
                "cadence": "3 posts/week",
                "channels": [social_channel],
                "mix": ["education", "proof", "objection handling", "CTA"],
            },
            content_backlog=[
                {"type": "blog", "title": brief["title"], "status": "draft"} for brief in blog_briefs
            ]
            + [
                {"type": "case-study", "title": f"Proof story for {product.name}", "status": "planned"},
                {"type": "lead-magnet", "title": f"Buyer guide for {product.category}", "status": "planned"},
            ],
            execution_backlog=[
                {"owner": "research-seo", "task": "Expand keyword map and intent clusters", "status": "planned"},
                {"owner": "content-social", "task": "Draft first 2 blog pieces and 3 social posts", "status": "planned"},
                {"owner": "cro-lifecycle", "task": "Implement proof-first landing page test", "status": "planned"},
                {"owner": "analytics-qa", "task": "Define weekly KPI dashboard and approval checks", "status": "planned"},
            ],
        )
        qa_report = self._score(asset_pack)
        approval_request = self.approvals.create_request(
            ApprovalRequest(
                product_slug=product.slug,
                summary="Approve draft content, lifecycle assets, and channel execution backlog",
                asset_ids=[item["id"] for item in asset_pack.social_posts] + [item["id"] for item in asset_pack.email_sequence],
                risk_level="medium",
            )
        )
        self._persist_growth_cycle(
            product_slug=product.slug,
            strategy=strategy,
            market=market,
            customer=customer,
            competitor=competitor,
            campaign_plan=planner,
            asset_pack=asset_pack,
            qa_report=qa_report,
            approval_request_id=approval_request.request_id,
        )
        return GrowthCycleResult(
            product=product,
            strategy=strategy,
            opportunities=opportunities,
            campaign_plan=campaign_plan,
            asset_pack=asset_pack,
            qa_report=qa_report,
            approval_request=approval_request,
        )

    def _persist_growth_cycle(
        self,
        product_slug: str,
        strategy: Strategy,
        market: dict,
        customer: dict,
        competitor: dict,
        campaign_plan: dict,
        asset_pack: AssetPack,
        qa_report: QAReport,
        approval_request_id: str,
    ) -> None:
        campaign_payload = {
            "strategy": {
                **asdict(strategy),
                "research_summary": {
                    "market": market,
                    "customer": customer,
                    "competitor": competitor,
                },
            },
            "campaign_plan": campaign_plan,
            "asset_pack": asdict(asset_pack),
            "qa_report": asdict(qa_report),
        }
        self.repo.write_nested_json(product_slug, "campaigns/latest.json", campaign_payload)
        queue_items = []
        for item in asset_pack.social_posts:
            queue_items.append({"type": "social", "id": item["id"], "channel": item["channel"], "status": "draft"})
        for item in asset_pack.email_sequence:
            queue_items.append({"type": "email", "id": item["id"], "status": "draft"})
        for item in asset_pack.blog_briefs:
            queue_items.append({"type": "blog", "id": item["title"], "status": "draft"})
        self.repo.write_nested_json(
            product_slug,
            "queue/drafts.json",
            {
                "approval_request_id": approval_request_id,
                "status": "awaiting_approval",
                "items": queue_items,
            },
        )
        self.repo.write_nested_text(
            product_slug,
            "ops/cron-manifest.md",
            "# Cron Manifest\n\n"
            "- Daily: market pulse, backlog refresh, and draft production\n"
            "- Weekly: KPI aggregation, QA review, and director digest\n"
            "- Monthly: strategy review, experiment reset, and channel reprioritization\n",
        )

    def _opportunities(self, product, market: dict, customer: dict, competitor: dict, cro: dict) -> list[str]:
        return [
            f"Own the trust angle in {product.category} with proof-led education.",
            market["channel_opportunities"][0],
            f"Address the objection '{customer['objections'][0]}' directly in landing page and lifecycle copy.",
            competitor["differentiation_angles"][0],
            f"Prioritize CRO experiment: {cro['experiments'][0]['name']}",
        ]

    def _channel_priorities(self, product) -> list[dict[str, str]]:
        priorities = []
        for channel in product.channels[:4]:
            reason = {
                "seo": "captures high-intent demand and compounds over time",
                "email": "converts and retains demand you already paid to earn",
                "linkedin": "works well for founder-led and B2B proof distribution",
                "instagram": "supports proof, product stories, and short-form discovery",
                "youtube": "good for authority and long-form education",
                "social": "keeps the brand visible and multiplies proof assets",
            }.get(channel, "supports awareness and nurturing when used with clear CTAs")
            priorities.append({"channel": channel, "why_now": reason})
        return priorities

    def _gtm_motion(self, product) -> str:
        if product.business_model == "b2b_saas":
            return "demand capture + lead nurture + sales-assisted close"
        if product.business_model == "ecommerce":
            return "traffic + conversion + retention loop"
        if product.business_model == "education":
            return "authority content + trust build + enrollment conversion"
        return "educate + capture + convert"

    def _north_star_metric(self, product) -> str:
        if product.business_model == "b2b_saas":
            return "qualified pipeline created"
        if product.business_model == "ecommerce":
            return "revenue per visitor"
        if product.business_model == "education":
            return "enrollments"
        return "qualified conversions"

    def _primary_cta(self, product) -> str:
        if product.business_model == "b2b_saas":
            return "Book a demo or request an audit"
        if product.business_model == "ecommerce":
            return "Start with the hero offer or bundle"
        return "Take the next qualifying action"

    def _score(self, asset_pack: AssetPack) -> QAReport:
        scores = {
            "accuracy": 4,
            "voice_match": 4,
            "specificity": 4,
            "cta_strength": 4,
            "channel_fit": 4,
            "compliance": 4,
        }
        blockers = []
        readiness = "pass" if min(scores.values()) >= 4 else "revise"
        if any("guarantee" in post["caption"].lower() for post in asset_pack.social_posts):
            readiness = "blocked"
            blockers.append("Unverifiable guarantee detected")
        return QAReport(scores=scores, publish_readiness=readiness, blockers=blockers)
