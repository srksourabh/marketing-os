import { DELIVERABLE_OPTIONS, OPTION_INDEX } from './config.js';
import { buildExperience, enrichDeliverableOption } from './experience.js';
import { json } from './utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/deliverables') {
      return json({ items: DELIVERABLE_OPTIONS.map(enrichDeliverableOption) });
    }

    if (request.method === 'POST' && url.pathname === '/experience') {
      try {
        const payload = await request.json();
        const selectedItems = Array.isArray(payload.selected_items) ? payload.selected_items : [];
        if (!selectedItems.length) {
          return json({ detail: 'Select at least one deliverable.' }, 400);
        }
        const invalid = selectedItems.filter((item) => !OPTION_INDEX[item]);
        if (invalid.length) {
          return json({ detail: `Unknown deliverables: ${invalid.join(', ')}` }, 400);
        }
        return json(await buildExperience(payload, env));
      } catch (error) {
        return json({ detail: error instanceof Error ? error.message : 'Invalid request.' }, 400);
      }
    }

    if (request.method === 'GET') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
