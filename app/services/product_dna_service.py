from __future__ import annotations

import re
from textwrap import dedent

from app.models import Product
from app.storage import ProductRepository


class ProductDNAService:
    DEFAULT_CHANNELS = ["seo", "email", "linkedin", "x", "community"]
    DEFAULT_GOALS = ["increase qualified pipeline", "improve conversion rate", "build repeatable demand generation"]
    DEFAULT_PROOF_POINTS = ["customer outcomes", "product workflow evidence", "case study data"]

    def __init__(self, repo: ProductRepository):
        self.repo = repo

    def onboard_product(self, payload: dict) -> Product:
        normalized = self._normalize_payload(payload)
        slug = self._slugify(normalized["name"])
        product = Product(
            slug=slug,
            name=normalized["name"],
            category=normalized["category"],
            problem=normalized["problem"],
            audience=normalized["audience"],
            differentiators=normalized["differentiators"],
            channels=normalized["channels"],
            goals=normalized["goals"],
            proof_points=normalized["proof_points"],
            messaging_pillars=self._messaging_pillars(normalized),
            brand_voice=self._brand_voice(normalized),
            brief_description=normalized["brief_description"],
            business_model=normalized["business_model"],
        )
        self.repo.save_product(product)
        self._write_artifacts(product)
        return product

    def _normalize_payload(self, payload: dict) -> dict:
        brief = payload.get("brief_description", "").strip()
        category = payload.get("category") or self._infer_category(brief)
        problem = payload.get("problem") or self._infer_problem(brief)
        audience = payload.get("audience") or self._infer_audience(brief)
        business_model = payload.get("business_model") or self._infer_business_model(brief, category)
        channels = payload.get("channels") or self._infer_channels(brief, business_model)
        goals = payload.get("goals") or self.DEFAULT_GOALS
        differentiators = payload.get("differentiators") or self._infer_differentiators(brief, category)
        proof_points = payload.get("proof_points") or self.DEFAULT_PROOF_POINTS
        return {
            "name": payload["name"],
            "brief_description": brief or f"{payload['name']} in {category} for {audience}.",
            "category": category,
            "problem": problem,
            "audience": audience,
            "business_model": business_model,
            "channels": channels,
            "goals": goals,
            "differentiators": differentiators,
            "proof_points": proof_points,
        }

    def _slugify(self, value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")

    def _infer_category(self, brief: str) -> str:
        text = brief.lower()
        if any(word in text for word in ["software", "saas", "crm", "platform", "automation"]):
            return "software"
        if any(word in text for word in ["clinic", "health", "patient", "doctor"]):
            return "healthcare service"
        if any(word in text for word in ["course", "education", "school", "student"]):
            return "education"
        if any(word in text for word in ["ecommerce", "shop", "store", "consumer brand"]):
            return "consumer brand"
        return "digital product"

    def _infer_problem(self, brief: str) -> str:
        cleaned = brief.strip().rstrip(".")
        if not cleaned:
            return "an urgent customer problem"
        for marker in [" to ", " for ", " helps ", " that "]:
            if marker in cleaned.lower():
                return cleaned.split(marker, 1)[1].strip().rstrip(".")
        return cleaned

    def _infer_audience(self, brief: str) -> str:
        text = brief.lower()
        if "clinic" in text:
            return "clinic owners and practice managers"
        if any(word in text for word in ["b2b", "team", "sales", "ops"]):
            return "operators and decision-makers"
        if any(word in text for word in ["student", "parent", "teacher"]):
            return "students and parents"
        if any(word in text for word in ["consumer", "shopper", "creator"]):
            return "end customers"
        return "buyers with a clear pain point"

    def _infer_business_model(self, brief: str, category: str) -> str:
        text = brief.lower()
        if any(word in text for word in ["subscription", "saas", "software", "platform", "crm"]):
            return "b2b_saas"
        if any(word in text for word in ["course", "coaching", "cohort"]):
            return "education"
        if any(word in text for word in ["clinic", "agency", "service"]):
            return "service_business"
        if "brand" in category or any(word in text for word in ["ecommerce", "shop", "store"]):
            return "ecommerce"
        return "generic"

    def _infer_channels(self, brief: str, business_model: str) -> list[str]:
        text = brief.lower()
        channels: list[str] = []
        if any(word in text for word in ["search", "seo", "traffic", "organic"]):
            channels.append("seo")
        if business_model in {"b2b_saas", "service_business"}:
            channels.extend(["linkedin", "email"])
        if business_model == "ecommerce":
            channels.extend(["instagram", "email"])
        if business_model == "education":
            channels.extend(["youtube", "email"])
        channels.extend(["seo", "email", "social"])
        unique: list[str] = []
        for channel in channels or self.DEFAULT_CHANNELS:
            if channel not in unique:
                unique.append(channel)
        return unique[:5]

    def _infer_differentiators(self, brief: str, category: str) -> list[str]:
        text = brief.lower()
        candidates: list[str] = []
        if any(word in text for word in ["automation", "ai", "workflow"]):
            candidates.append("automation-driven workflow")
        if any(word in text for word in ["analytics", "data", "reporting"]):
            candidates.append("visible ROI and reporting")
        if any(word in text for word in ["simple", "easy", "reduce", "save time"]):
            candidates.append("fast time-to-value")
        candidates.append(f"clear positioning in {category}")
        return candidates[:3]

    def _messaging_pillars(self, payload: dict) -> list[str]:
        return [
            f"Solve {payload['problem']}",
            f"Differentiate with {', '.join(payload.get('differentiators', []))}",
            f"Prove value using {', '.join(payload.get('proof_points', [])) or 'customer evidence'}",
        ]

    def _brand_voice(self, payload: dict) -> list[str]:
        return [
            "clear and specific",
            "credible, not hypey",
            f"speaks to {payload['audience']}",
        ]

    def _write_artifacts(self, product: Product) -> None:
        self.repo.write_text_artifact(product.slug, "brief.md", dedent(f"""
        # {product.name}

        - Category: {product.category}
        - Business model: {product.business_model}
        - Audience: {product.audience}
        - Problem: {product.problem}
        - Goals: {', '.join(product.goals)}
        - Brief: {product.brief_description}
        """).strip() + "\n")
        self.repo.write_text_artifact(product.slug, "brand_context.md", dedent(f"""
        # Brand Context

        {product.name} helps {product.audience} solve {product.problem}.
        Differentiators: {', '.join(product.differentiators)}.
        Proof points: {', '.join(product.proof_points)}.
        """).strip() + "\n")
        self.repo.write_text_artifact(product.slug, "brand_voice.md", "\n".join(f"- {line}" for line in product.brand_voice) + "\n")
        self.repo.write_text_artifact(product.slug, "icp.md", dedent(f"""
        # ICP

        Primary audience: {product.audience}
        Core problem: {product.problem}
        Desired outcome: confidence, convenience, and measurable results.
        """).strip() + "\n")
        self.repo.write_text_artifact(product.slug, "gtm_strategy.md", dedent(f"""
        # GTM Strategy

        - Motion: {self._default_gtm_motion(product)}
        - Priority channels: {', '.join(product.channels[:3])}
        - Offer angle: {product.messaging_pillars[0]}
        - Demand thesis: Educate the market, capture intent, and convert with proof.
        """).strip() + "\n")
        self.repo.write_text_artifact(product.slug, "analytics_plan.md", dedent(f"""
        # Analytics Plan

        - North star: qualified pipeline created
        - Core KPIs: traffic, leads, revenue, conversion_rate
        - Funnel checkpoints: visit -> lead -> qualified -> customer
        - Reporting rhythm: weekly summary, monthly strategy review
        """).strip() + "\n")
        self.repo.write_text_artifact(product.slug, "social_posting_plan.md", dedent(f"""
        # Social Posting Plan

        - Cadence: 3 posts/week
        - Content mix: education, proof, objections, CTA
        - Primary channels: {', '.join([c for c in product.channels if c not in {'seo', 'email'}][:2]) or 'social'}
        - Rule: channel-native rewrites, no copy-paste syndication
        """).strip() + "\n")
        self.repo.write_text_artifact(
            product.slug,
            "claims.yaml",
            "approved_claims:\n"
            "  - product workflow and feature facts\n"
            "  - verified customer evidence\n"
            "  - transparent pricing and process claims\n"
            "blocked_claims:\n"
            "  - guaranteed results\n"
            "  - invented testimonials\n"
            "  - unverifiable market leadership claims\n",
        )
        self.repo.write_text_artifact(product.slug, "kpis.yaml", "kpis:\n  - traffic\n  - leads\n  - revenue\n  - conversion_rate\n")
        self.repo.write_text_artifact(product.slug, "channels.yaml", "channels:\n" + "\n".join(f"  - {c}" for c in product.channels) + "\n")
        self.repo.write_text_artifact(product.slug, "approvals.yaml", "publish_requires_approval: true\nad_spend_requires_approval: true\n")

    def _default_gtm_motion(self, product: Product) -> str:
        if product.business_model == "b2b_saas":
            return "problem education -> lead capture -> sales-assisted conversion"
        if product.business_model == "ecommerce":
            return "intent capture -> social proof -> conversion -> retention"
        if product.business_model == "education":
            return "authority content -> trust build -> enrollment conversion"
        return "intent capture -> nurture -> conversion"
