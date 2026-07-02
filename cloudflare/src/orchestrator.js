/**
 * orchestrator.js – Cloudflare Worker DAG orchestrator for the 23-node Marketing OS.
 * Pure ES module, no Node.js APIs.
 */

import { GLOBAL_SYSTEM_BLOCK, NODE_PROMPTS, DAG } from './node-prompts.js';
import { callLLM, inferLLMProvider, defaultModel } from './llm-client.js';
import { generateGeminiImage, generateOpenAiImage, inferProviderFromKey, normalizeProvider, buildLogoSvg, buildIconSvg } from './assets.js';

/* Max output tokens by layer — generous to avoid truncation */
const MAX_TOKENS_BY_LAYER = { 1: 4096, 2: 8192, 3: 8192, 4: 8192, 5: 4096 };

/* ------------------------------------------------------------------ */
/*  Dependency resolution & topological sort                          */
/* ------------------------------------------------------------------ */

/**
 * Given a set of selected node keys, walk the DAG backwards to collect
 * every ancestor that must run first, then return a topologically-sorted
 * array (ancestors before dependents).
 */
function resolveAndSort(selectedNodes) {
  const required = new Set();

  function addWithDeps(nodeId) {
    if (required.has(nodeId)) return;
    required.add(nodeId);
    const deps = DAG[nodeId];
    if (deps) {
      for (const dep of deps) {
        addWithDeps(dep);
      }
    }
  }

  for (const nodeId of selectedNodes) {
    addWithDeps(nodeId);
  }

  // Kahn's algorithm for topological sort
  const inDegree = {};
  const adj = {};
  for (const n of required) {
    inDegree[n] = 0;
    adj[n] = [];
  }
  for (const n of required) {
    const deps = DAG[n] || [];
    for (const dep of deps) {
      if (required.has(dep)) {
        adj[dep].push(n);
        inDegree[n]++;
      }
    }
  }

  const queue = [];
  for (const n of required) {
    if (inDegree[n] === 0) queue.push(n);
  }
  // Sort the initial queue for deterministic ordering
  queue.sort();

  const sorted = [];
  while (queue.length > 0) {
    // Sort for deterministic pick among same-level nodes
    queue.sort();
    const node = queue.shift();
    sorted.push(node);
    for (const neighbour of adj[node]) {
      inDegree[neighbour]--;
      if (inDegree[neighbour] === 0) {
        queue.push(neighbour);
      }
    }
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Variable replacement                                              */
/* ------------------------------------------------------------------ */

function buildVariableMap({ productName, productDescription, artifacts, knownCompetitors, constraints, vocRaw, startDate, timezone }) {
  return {
    product_name: productName,
    product_description: productDescription,
    product_summary_json: artifacts.product_summary || '',
    brand_context_json: artifacts.brand_context || '',
    brand_voice_json: artifacts.brand_voice || '',
    icp_json: artifacts.icp || '',
    market_research_md: artifacts.market_research || '',
    customer_insights_json: artifacts.customer_insights || '',
    competitor_intel_md: artifacts.competitor_intel || '',
    gtm_strategy_md: artifacts.gtm_strategy || '',
    channel_priorities_json: artifacts.channel_priorities || '',
    campaign_plan_md: artifacts.campaign_plan || '',
    analytics_plan_json: artifacts.analytics_plan || '',
    seo_brief_json: artifacts.seo_brief || '',
    blog_briefs_json: artifacts.blog_briefs || '',
    social_content_json: artifacts.social_posts || '',
    email_sequence_json: artifacts.email_sequence || '',
    landing_page_copy_md: artifacts.landing_page_copy || '',
    content_backlog_json: artifacts.content_backlog || '',
    social_posting_plan_json: artifacts.social_posting_plan || '',
    execution_backlog_json: artifacts.execution_backlog || '',
    known_competitors: knownCompetitors || '',
    constraints: constraints || '',
    voice_of_customer_raw: vocRaw || '',
    start_date: startDate || new Date().toISOString().slice(0, 10),
    timezone: timezone || 'Asia/Kolkata',
    brief_count: '3',
    post_count: '10',
    sequence_type: 'welcome',
  };
}

function injectVariables(template, varMap) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in varMap) return varMap[key];
    // Unknown placeholder – leave empty rather than leaving raw mustache
    return '';
  });
}

/* ------------------------------------------------------------------ */
/*  Output cleanup & validation                                       */
/* ------------------------------------------------------------------ */

/** Strip markdown code fences that LLMs love to add */
function stripCodeFences(text) {
  if (!text) return text;
  let t = text.trim();

  // Remove any preamble text before the first code fence
  // e.g. "Here is the JSON:\n```json\n{...}\n```"
  const fenceStart = t.indexOf('```');
  if (fenceStart > 0) {
    t = t.slice(fenceStart).trim();
  }

  // Multi-line: ```json\n...\n``` (greedy inner match, anchored to last ```)
  const fenced = t.match(/^```(?:\w+)?\s*\n?([\s\S]*)```\s*$/);
  if (fenced) return fenced[1].trim();

  return t;
}

/** Attempt to repair truncated JSON (unclosed strings, brackets, braces) */
function repairJSON(text) {
  if (!text) return text;
  let t = text.trim();

  // If it already parses, return as-is
  try { JSON.parse(t); return t; } catch { /* needs repair */ }

  // Close unclosed string literals
  const quoteCount = (t.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) t += '"';

  // Balance brackets and braces
  let braces = 0, brackets = 0;
  let inString = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"' && (i === 0 || t[i - 1] !== '\\')) { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') braces++;
    else if (c === '}') braces--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
  }

  // Remove trailing comma before closing
  t = t.replace(/,\s*$/, '');

  while (brackets > 0) { t += ']'; brackets--; }
  while (braces > 0) { t += '}'; braces--; }

  return t;
}

/** Known failure tokens from node prompts */
const FAILURE_TOKENS = new Set([
  'INSUFFICIENT_INPUT',
  'REQUIRED_INPUT_EMPTY',
  'EMPTY_INPUT',
]);

function isFailureToken(output) {
  if (!output) return false;
  const cleaned = output.trim().replace(/^["'{}\s]+|["'{}\s]+$/g, '');
  // Check raw text
  if (FAILURE_TOKENS.has(cleaned)) return true;
  // Check JSON-wrapped: {"error":"INSUFFICIENT_INPUT"}
  try {
    const parsed = JSON.parse(output);
    if (parsed?.error && FAILURE_TOKENS.has(parsed.error)) return true;
  } catch { /* not JSON, that's fine */ }
  return false;
}

function validateOutput(output, outputFormat) {
  // Failure tokens are valid structured responses — skip format validation
  if (isFailureToken(output)) return true;

  if (outputFormat === 'json') {
    JSON.parse(output); // throws on invalid JSON
    return true;
  }
  if (outputFormat === 'markdown') {
    // Accept any heading level (# ## ### etc) or structured content
    if (!output.includes('#') && output.length < 50) {
      throw new Error('Markdown output missing expected headings');
    }
    return true;
  }
  // No specific validation for other formats
  return true;
}

/* ------------------------------------------------------------------ */
/*  Temperature helper                                                */
/* ------------------------------------------------------------------ */

function temperatureForLayer(layer) {
  // L4 (creative content) gets higher temperature; everything else stays low
  if (layer === 4 || layer === 'L4') return 0.6;
  return 0.2;
}

/* ------------------------------------------------------------------ */
/*  Main DAG runner (async generator)                                 */
/* ------------------------------------------------------------------ */

export async function* runDAG({
  selectedNodes,
  productName,
  productDescription,
  llmConfig,
  imageConfig,
  constraints,
  knownCompetitors,
  vocRaw,
  startDate,
  timezone,
}) {
  const sortedNodes = resolveAndSort(selectedNodes);
  const artifacts = {};
  let logoGenerated = false;

  for (const nodeId of sortedNodes) {
    const nodeMeta = NODE_PROMPTS[nodeId];
    if (!nodeMeta) {
      yield { type: 'node_error', nodeId, error: `Unknown node: ${nodeId}` };
      continue;
    }

    const { prompt: promptTemplate, tier, label, layer, outputFormat } = nodeMeta;

    // 1. Yield start event
    yield { type: 'node_start', nodeId, label, layer };

    // 2. Build the full prompt with variable injection
    const varMap = buildVariableMap({
      productName,
      productDescription,
      artifacts,
      knownCompetitors,
      constraints,
      vocRaw,
      startDate,
      timezone,
    });

    const systemPrompt = GLOBAL_SYSTEM_BLOCK;
    const userPrompt = injectVariables(promptTemplate, varMap);

    // 3. Determine model from tier + resolve provider/apiKey from llmConfig
    const { provider, apiKey, reasoningModel, fastModel } = llmConfig;
    const model =
      tier === 'reasoning'
        ? (reasoningModel || defaultModel(provider))
        : (fastModel || defaultModel(provider));

    const temperature = temperatureForLayer(layer);
    const maxTokens = MAX_TOKENS_BY_LAYER[layer] || 4096;

    // 4. Call LLM (with one retry — second attempt adds anti-fence instruction)
    let output = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const callTemp = attempt === 0 ? temperature : 0;
        // On retry, prepend a strong instruction to avoid code fences
        const retryPrefix = attempt > 0
          ? 'CRITICAL: Output ONLY raw content. No markdown code fences (```), no preamble, no commentary. If JSON, start with { or [. If markdown, start with #.\n\n'
          : '';
        const llmResponse = await callLLM({
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt: retryPrefix + userPrompt,
          temperature: callTemp,
          maxTokens,
        });

        // Extract text from {text, usage} response
        output = stripCodeFences(llmResponse.text);

        // For JSON outputs, attempt repair of truncated responses
        if (outputFormat === 'json') {
          output = repairJSON(output);
        }

        // 5. Validate
        validateOutput(output, outputFormat);

        // Validation passed – break out of retry loop
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        output = null;
      }
    }

    if (lastError) {
      // Both attempts failed
      artifacts[nodeId] = null;
      yield { type: 'node_error', nodeId, error: lastError.message || String(lastError) };
      continue;
    }

    // 6. Store artifact & yield completion
    artifacts[nodeId] = output;
    yield { type: 'node_complete', nodeId, label, output };

    // 6b. After brand_context completes, generate logo if image key is available
    if (nodeId === 'brand_context' && imageConfig?.apiKey && !logoGenerated) {
      logoGenerated = true;
      yield { type: 'node_start', nodeId: 'logo_generation', label: 'Logo Generation', layer: 'img' };

      try {
        // Parse brand context for logo prompt inputs
        let brandData = {};
        try { brandData = JSON.parse(artifacts.brand_context); } catch { /* skip */ }
        let productData = {};
        try { productData = JSON.parse(artifacts.product_summary); } catch { /* skip */ }

        const brandName = productName;
        const positioning = brandData.positioning_statement || brandData.brand_promise || productDescription;
        const category = productData.category || '';

        // Build logo prompt
        const logoPrompt = `Create a premium logo concept for "${brandName}". Symbol only, no words, no letters, no typography, no text. Style: dark-luxury minimalism, geometric mark, high contrast. Category: ${category}. Brand positioning: ${positioning}. Clean isolated design on dark background.`;
        const iconPrompt = `Create a minimal app icon / favicon for "${brandName}". Abstract geometric symbol, no text, no letters. Single clean shape. Bold and recognizable at 64x64px. Dark luxury style.`;

        const generator = imageConfig.provider === 'openai'
          ? (p) => generateOpenAiImage(imageConfig.apiKey, p)
          : (p) => generateGeminiImage(imageConfig.apiKey, p);

        const results = await Promise.allSettled([
          generator(logoPrompt),
          generator(iconPrompt),
        ]);

        const logoImages = {
          logo: results[0].status === 'fulfilled' ? results[0].value : null,
          icon: results[1].status === 'fulfilled' ? results[1].value : null,
          logoError: results[0].status === 'rejected' ? results[0].reason?.message : null,
          iconError: results[1].status === 'rejected' ? results[1].reason?.message : null,
          logoPrompt,
          iconPrompt,
          provider: imageConfig.provider,
        };

        artifacts.logo_generation = JSON.stringify(logoImages);
        const logoErrors = [logoImages.logoError, logoImages.iconError].filter(Boolean);
        yield { type: 'node_complete', nodeId: 'logo_generation', label: 'Logo Generation', output: JSON.stringify({ status: logoImages.logo || logoImages.icon ? 'ok' : 'failed', provider: imageConfig.provider, logo: !!logoImages.logo, icon: !!logoImages.icon, errors: logoErrors.length ? logoErrors : undefined }) };
      } catch (err) {
        yield { type: 'node_error', nodeId: 'logo_generation', error: err.message || 'Logo generation failed' };
      }
    }
  }

  // 7. All nodes done
  yield { type: 'complete', artifacts };
}
