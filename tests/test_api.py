import asyncio

import httpx

from app.main import app


def test_api_onboard_campaign_and_report_flow():
    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            payload = {
                "name": "Vegan Silk",
                "category": "plant-based haircare",
                "problem": "frizzy hair without harsh chemicals",
                "audience": "women with dry curly hair in India",
                "differentiators": ["vegan", "silk-finish", "sulfate-free"],
                "channels": ["instagram", "email", "seo"],
                "goals": ["increase qualified leads", "improve conversion rate"],
                "proof_points": ["repeat customers", "before-after feedback"],
            }

            onboard = await client.post("/products/onboard", json=payload)
            assert onboard.status_code == 200
            slug = onboard.json()["slug"]

            strategy = await client.post(f"/products/{slug}/campaigns", json={"objective": "launch a 30-day growth sprint"})
            assert strategy.status_code == 200
            body = strategy.json()
            assert body["strategy"]["positioning_statement"]
            assert body["campaign_plan"]["calendar_weeks"] == 4
            assert body["approval_request"]["risk_level"] == "medium"

            metrics_one = await client.post(f"/products/{slug}/metrics/ingest", json={"week": "2026-W27", "metrics": {"traffic": 1200, "leads": 80, "revenue": 50000, "conversion_rate": 0.032}})
            metrics_two = await client.post(f"/products/{slug}/metrics/ingest", json={"week": "2026-W28", "metrics": {"traffic": 1450, "leads": 104, "revenue": 68000, "conversion_rate": 0.041}})
            assert metrics_one.status_code == 200
            assert metrics_two.status_code == 200

            report = await client.get(f"/products/{slug}/reports/weekly/latest?week=2026-W28")
            assert report.status_code == 200
            report_body = report.json()
            assert report_body["markdown_path"].endswith("2026-W28.md")
            assert len(report_body["chart_paths"]) == 2

    asyncio.run(_run())
