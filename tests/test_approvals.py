from pathlib import Path

from app.approvals import ApprovalService, ApprovalRequest
from app.storage import ProductRepository


def test_approval_required_before_execution(tmp_path: Path):
    repo = ProductRepository(tmp_path)
    service = ApprovalService(repo)

    request = ApprovalRequest(
        product_slug="vegan-silk",
        summary="Publish 3 Instagram posts and welcome email",
        asset_ids=["social-1", "social-2", "email-1"],
        risk_level="medium",
    )
    created = service.create_request(request)

    assert service.can_execute(created.request_id) is False

    service.decide(created.request_id, approved=True, approver="owner")

    assert service.can_execute(created.request_id) is True
