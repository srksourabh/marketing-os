from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Product:
    slug: str
    name: str
    category: str
    problem: str
    audience: str
    differentiators: list[str]
    channels: list[str]
    goals: list[str]
    proof_points: list[str]
    messaging_pillars: list[str]
    brand_voice: list[str]
    brief_description: str = ""
    business_model: str = "generic"
    kpis: list[str] = field(default_factory=lambda: ["traffic", "leads", "revenue", "conversion_rate"])

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Strategy:
    positioning_statement: str
    value_props: list[str]
    campaign_themes: list[str]
    opportunities: list[str]
    gtm_motion: str
    funnel_summary: list[str]
    channel_priorities: list[dict[str, str]]


@dataclass
class CampaignPlan:
    objective: str
    calendar_weeks: int
    channel_mix: list[str]
    experiments: list[str]
    funnel_stages: list[dict[str, str]]
    conversion_goals: list[str]


@dataclass
class AssetPack:
    social_posts: list[dict[str, str]]
    email_sequence: list[dict[str, str]]
    seo_brief: dict[str, Any]
    blog_briefs: list[dict[str, Any]]
    landing_page_sections: list[dict[str, str]]
    designer_brief: dict[str, Any]
    cro_recommendations: list[dict[str, str]]
    analytics_plan: dict[str, Any]
    social_posting_plan: dict[str, Any]
    content_backlog: list[dict[str, str]]
    execution_backlog: list[dict[str, str]]


@dataclass
class QAReport:
    scores: dict[str, int]
    publish_readiness: str
    blockers: list[str]


@dataclass
class ApprovalRequestRecord:
    request_id: str
    product_slug: str
    summary: str
    asset_ids: list[str]
    risk_level: str
    approved: bool = False
    approver: str | None = None


@dataclass
class GrowthCycleResult:
    product: Product
    strategy: Strategy
    opportunities: list[str]
    campaign_plan: CampaignPlan
    asset_pack: AssetPack
    qa_report: QAReport
    approval_request: ApprovalRequestRecord


@dataclass
class ReportArtifacts:
    markdown_path: Path
    json_path: Path
    chart_paths: list[Path]
