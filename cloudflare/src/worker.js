import { DELIVERABLE_OPTIONS, OPTION_INDEX } from './config.js';
import { buildExperience, enrichDeliverableOption } from './experience.js';
import { json } from './utils.js';
import { runDAG } from './orchestrator.js';
import { inferLLMProvider, defaultModel } from './llm-client.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/deliverables') {
      return json({ items: DELIVERABLE_OPTIONS.map(enrichDeliverableOption) });
    }

    // Legacy deterministic mode (kept for backward compat)
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

    // LLM-powered BYOK mode — streams Server-Sent Events
    if (request.method === 'POST' && url.pathname === '/run') {
      try {
        const payload = await request.json();
        const { name, description, selected_nodes, byok = {} } = payload;

        if (!name?.trim() || !description?.trim()) {
          return json({ detail: 'Product name and description are required.' }, 400);
        }

        const llmKey = (byok.llm_key || '').trim();
        if (!llmKey) {
          return json({ detail: 'An LLM API key is required for AI-powered mode. Paste your Anthropic, OpenAI, or Gemini key.' }, 400);
        }

        const provider = byok.llm_provider || inferLLMProvider(llmKey);
        if (!provider) {
          return json({ detail: 'Could not detect LLM provider from key. Select one explicitly.' }, 400);
        }

        const reasoningModel = byok.reasoning_model || defaultModel(provider);
        const fastModel = byok.fast_model || (provider === 'anthropic' ? 'claude-haiku-4-20250414' : provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash');

        const selectedNodes = Array.isArray(selected_nodes) && selected_nodes.length > 0
          ? selected_nodes
          : ['product_summary', 'brand_context', 'brand_voice', 'icp', 'market_research', 'customer_insights', 'competitor_intel'];

        const llmConfig = { provider, apiKey: llmKey, reasoningModel, fastModel };

        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        const sendEvent = async (event) => {
          await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        // Run the DAG in the background, streaming events
        (async () => {
          try {
            const dag = runDAG({
              selectedNodes,
              productName: name.trim(),
              productDescription: description.trim(),
              llmConfig,
              constraints: payload.constraints || '',
              knownCompetitors: payload.known_competitors || '',
              vocRaw: payload.voc_raw || '',
              startDate: payload.start_date || '',
              timezone: payload.timezone || 'Asia/Kolkata',
            });

            for await (const event of dag) {
              await sendEvent(event);
            }
          } catch (err) {
            await sendEvent({ type: 'fatal_error', error: err.message || 'Unknown error' });
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache',
            'connection': 'keep-alive',
            'access-control-allow-origin': '*',
          },
        });
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
