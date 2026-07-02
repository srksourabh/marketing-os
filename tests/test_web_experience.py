from __future__ import annotations

import asyncio

import httpx

from app.main import app


async def _client():
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


def test_home_page_serves_form():
    async def scenario():
        async with await _client() as client:
            response = await client.get("/")
            assert response.status_code == 200
            assert "Give me my market analysis" in response.text
            assert "Product name" in response.text
            assert "Description" in response.text

    asyncio.run(scenario())


def test_experience_dispatches_only_selected_outputs_and_downloads():
    async def scenario():
        async with await _client() as client:
            response = await client.post(
                "/experience",
                json={
                    "name": "Silky",
                    "description": "Premium vegan silk haircare brand for smoother, softer hair without harsh chemicals.",
                    "selected_items": ["product_summary", "social_posts", "content_gen_prompt"],
                },
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["slug"] == "silky"
            assert len(payload["selected_outputs"]) == 3
            ids = [item["id"] for item in payload["selected_outputs"]]
            assert ids == ["product_summary", "social_posts", "content_gen_prompt"]

            social_output = next(item for item in payload["selected_outputs"] if item["id"] == "social_posts")
            assert "social-1" in social_output["preview"]

            prompt_output = next(item for item in payload["selected_outputs"] if item["id"] == "content_gen_prompt")
            download = await client.get(prompt_output["download_url"])
            assert download.status_code == 200
            text = download.text
            assert "Create marketing content for Silky" in text
            assert "Three fresh social posts" in text

    asyncio.run(scenario())


def test_experience_requires_selected_items():
    async def scenario():
        async with await _client() as client:
            response = await client.post(
                "/experience",
                json={
                    "name": "Silky",
                    "description": "Premium vegan silk haircare brand",
                    "selected_items": [],
                },
            )
            assert response.status_code == 400
            assert response.json()["detail"] == "Select at least one deliverable."

    asyncio.run(scenario())
