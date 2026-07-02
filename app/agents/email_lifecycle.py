from __future__ import annotations

from app.models import Product


class EmailLifecycleAgent:
    def build_sequence(self, product: Product) -> dict:
        return {
            "sequence": [
                {
                    "id": "email-1",
                    "subject": f"A clearer path to solving {product.problem}",
                    "body": f"Here is how {product.name} helps {product.audience} move from friction to measurable progress, step by step.",
                },
                {
                    "id": "email-2",
                    "subject": f"What buyers ask before choosing a {product.category} solution",
                    "body": "This email handles the top objections, shows proof, and points to the next best CTA.",
                },
                {
                    "id": "email-3",
                    "subject": "What to do next if the current workflow is costing revenue",
                    "body": "Close with urgency, a relevant proof point, and one clean conversion step.",
                },
            ]
        }
