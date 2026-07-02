import asyncio

import httpx

from app.main import app


def test_api_exposes_draft_queue_and_cron_manifest():
    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            payload = {
                "name": "Queue Demo",
                "category": "plant-based haircare",
                "problem": "frizzy hair without harsh chemicals",
                "audience": "women with dry curly hair in India",
                "differentiators": ["vegan", "silk-finish", "sulfate-free"],
                "channels": ["instagram", "email", "seo"],
                "goals": ["increase qualified leads", "improve conversion rate"],
                "proof_points": ["repeat customers", "before-after feedback"],
            }
            onboard = await client.post("/products/onboard", json=payload)
            slug = onboard.json()["slug"]
            await client.post(f"/products/{slug}/campaigns", json={"objective": "launch a 30-day growth sprint"})

            queue = await client.get(f"/products/{slug}/draft-queue")
            cron = await client.get(f"/products/{slug}/cron-manifest")

            assert queue.status_code == 200
            assert cron.status_code == 200
            assert queue.json()["items"]
            assert "Daily:" in cron.json()["content"]

    asyncio.run(_run())
