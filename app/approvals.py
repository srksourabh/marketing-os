from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from app.models import ApprovalRequestRecord
from app.storage import ProductRepository


@dataclass
class ApprovalRequest:
    product_slug: str
    summary: str
    asset_ids: list[str]
    risk_level: str


class ApprovalService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    def create_request(self, request: ApprovalRequest) -> ApprovalRequestRecord:
        record = ApprovalRequestRecord(
            request_id=f"apr-{uuid4().hex[:10]}",
            product_slug=request.product_slug,
            summary=request.summary,
            asset_ids=request.asset_ids,
            risk_level=request.risk_level,
        )
        return self.repo.create_approval(record)

    def decide(self, request_id: str, approved: bool, approver: str) -> ApprovalRequestRecord:
        return self.repo.set_approval_decision(request_id, approved=approved, approver=approver)

    def can_execute(self, request_id: str) -> bool:
        return self.repo.get_approval(request_id).approved
