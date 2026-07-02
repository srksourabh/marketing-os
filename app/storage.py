from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.models import ApprovalRequestRecord, Product


class ProductRepository:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.products_dir = self.root / "products"
        self.products_dir.mkdir(exist_ok=True)
        self.db_path = self.root / "marketing_os.db"
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS approvals (
                    request_id TEXT PRIMARY KEY,
                    product_slug TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    asset_ids TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    approved INTEGER NOT NULL DEFAULT 0,
                    approver TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS metrics (
                    product_slug TEXT NOT NULL,
                    week TEXT NOT NULL,
                    metrics_json TEXT NOT NULL,
                    PRIMARY KEY(product_slug, week)
                )
                """
            )

    def product_dir(self, slug: str) -> Path:
        path = self.products_dir / slug
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_product(self, product: Product) -> None:
        product_dir = self.product_dir(product.slug)
        (product_dir / "product.json").write_text(json.dumps(product.to_dict(), indent=2))

    def load_product(self, slug: str) -> Product:
        data = json.loads((self.product_dir(slug) / "product.json").read_text())
        return Product(**data)

    def write_text_artifact(self, slug: str, name: str, content: str) -> Path:
        path = self.product_dir(slug) / name
        path.write_text(content)
        return path

    def write_json_artifact(self, slug: str, name: str, data: dict[str, Any]) -> Path:
        path = self.product_dir(slug) / name
        path.write_text(json.dumps(data, indent=2))
        return path

    def write_nested_text(self, slug: str, relative_path: str, content: str) -> Path:
        path = self.product_dir(slug) / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path

    def write_nested_json(self, slug: str, relative_path: str, data: dict[str, Any]) -> Path:
        path = self.product_dir(slug) / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2))
        return path

    def read_nested_json(self, slug: str, relative_path: str) -> dict[str, Any]:
        path = self.product_dir(slug) / relative_path
        return json.loads(path.read_text())

    def read_nested_text(self, slug: str, relative_path: str) -> str:
        path = self.product_dir(slug) / relative_path
        return path.read_text()

    def create_approval(self, record: ApprovalRequestRecord) -> ApprovalRequestRecord:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO approvals (request_id, product_slug, summary, asset_ids, risk_level, approved, approver) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record.request_id, record.product_slug, record.summary, json.dumps(record.asset_ids), record.risk_level, int(record.approved), record.approver),
            )
        return record

    def get_approval(self, request_id: str) -> ApprovalRequestRecord:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT request_id, product_slug, summary, asset_ids, risk_level, approved, approver FROM approvals WHERE request_id = ?",
                (request_id,),
            ).fetchone()
        if row is None:
            raise KeyError(request_id)
        return ApprovalRequestRecord(
            request_id=row[0],
            product_slug=row[1],
            summary=row[2],
            asset_ids=json.loads(row[3]),
            risk_level=row[4],
            approved=bool(row[5]),
            approver=row[6],
        )

    def set_approval_decision(self, request_id: str, approved: bool, approver: str) -> ApprovalRequestRecord:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE approvals SET approved = ?, approver = ? WHERE request_id = ?",
                (int(approved), approver, request_id),
            )
        return self.get_approval(request_id)

    def record_metrics(self, product_slug: str, week: str, metrics: dict[str, Any]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO metrics (product_slug, week, metrics_json) VALUES (?, ?, ?)",
                (product_slug, week, json.dumps(metrics)),
            )

    def list_metrics(self, product_slug: str) -> list[tuple[str, dict[str, Any]]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT week, metrics_json FROM metrics WHERE product_slug = ? ORDER BY week",
                (product_slug,),
            ).fetchall()
        return [(week, json.loads(raw)) for week, raw in rows]
