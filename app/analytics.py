from __future__ import annotations

import json
from pathlib import Path

from app.models import ReportArtifacts
from app.storage import ProductRepository


class AnalyticsService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    def record_snapshot(self, product_slug: str, week: str, metrics: dict):
        self.repo.record_metrics(product_slug, week, metrics)


class ReportingService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    def build_weekly_report(self, product_slug: str, week: str) -> ReportArtifacts:
        rows = self.repo.list_metrics(product_slug)
        current_index = next(i for i, (w, _) in enumerate(rows) if w == week)
        current_week, current = rows[current_index]
        previous = rows[current_index - 1][1] if current_index > 0 else {}
        deltas = {k: current[k] - previous.get(k, 0) for k in current}

        charts_dir = self.repo.product_dir(product_slug) / "reports" / "charts"
        data_dir = self.repo.product_dir(product_slug) / "reports" / "data"
        weekly_dir = self.repo.product_dir(product_slug) / "reports" / "weekly"
        charts_dir.mkdir(parents=True, exist_ok=True)
        data_dir.mkdir(parents=True, exist_ok=True)
        weekly_dir.mkdir(parents=True, exist_ok=True)

        traffic_chart = charts_dir / f"{week}-traffic.svg"
        revenue_chart = charts_dir / f"{week}-revenue.svg"
        traffic_chart.write_text(self._line_chart(rows, metric="traffic", title="Traffic trend"))
        revenue_chart.write_text(self._line_chart(rows, metric="revenue", title="Revenue trend"))

        report_data = {
            "week": current_week,
            "current": current,
            "previous": previous,
            "deltas": deltas,
        }
        json_path = data_dir / f"{week}.json"
        json_path.write_text(json.dumps(report_data, indent=2))

        md = weekly_dir / f"{week}.md"
        md.write_text(
            f"# Weekly Report {week}\n\n"
            f"## KPI Summary\n"
            f"- Traffic: {current.get('traffic', 0)}\n"
            f"- Leads: {current.get('leads', 0)}\n"
            f"- Revenue: {current.get('revenue', 0)}\n"
            f"- Conversion rate: {current.get('conversion_rate', 0):.3f}\n\n"
            f"## Week-over-week\n"
            f"- Traffic delta: {deltas.get('traffic', 0)}\n"
            f"- Leads delta: {deltas.get('leads', 0)}\n"
            f"- Revenue delta: {deltas.get('revenue', 0)}\n"
            f"- Conversion delta: {deltas.get('conversion_rate', 0):.3f}\n"
        )
        return ReportArtifacts(markdown_path=md, json_path=json_path, chart_paths=[traffic_chart, revenue_chart])

    def _line_chart(self, rows: list[tuple[str, dict]], metric: str, title: str) -> str:
        values = [data.get(metric, 0) for _, data in rows]
        labels = [week for week, _ in rows]
        width = 480
        height = 220
        max_value = max(values) if any(values) else 1
        step_x = width / max(len(values) - 1, 1)
        points = []
        for i, value in enumerate(values):
            x = 20 + i * step_x * 0.9
            y = height - 20 - ((value / max_value) * (height - 60))
            points.append(f"{x:.1f},{y:.1f}")
        label_text = ''.join(f'<text x="{20 + i * step_x * 0.9:.1f}" y="210" font-size="10">{label}</text>' for i, label in enumerate(labels))
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">'
            f'<rect width="100%" height="100%" fill="white"/>'
            f'<text x="20" y="20" font-size="16">{title}</text>'
            f'<polyline fill="none" stroke="#2563eb" stroke-width="3" points="{" ".join(points)}"/>'
            f'{label_text}'
            f'</svg>'
        )
