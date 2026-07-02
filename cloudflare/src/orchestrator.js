/**
 * orchestrator.js – Cloudflare Worker DAG orchestrator for the 23-node Marketing OS.
 * Pure ES module, no Node.js APIs.
 */

import { GLOBAL_SYSTEM_BLOCK, NODE_PROMPTS, DAG } from './node-prompts.js';
import { callLLM, inferLLMProvider, defaultModel } from './llm-client.js';

/* Max output tokens by layer — research/strategy nodes need room */
const MAX_TOKENS_BY_LAYER = { 1: 2048, 2: 4096, 3: 4096, 4: 4096, 5: 2048 };

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
  // Match ```json ... ``` or ``` ... ``` or ```markdown ... ```
  const fenced = text.match(/^```(?:\w+)?\s*\n([\s\S]*?)```\s*$/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

function validateOutput(output, outputFormat) {
  if (outputFormat === 'json') {
    JSON.parse(output); // throws on invalid JSON
    return true;
  }
  if (outputFormat === 'markdown') {
    if (!output.includes('## ')) {
      throw new Error('Markdown output missing expected "## " headings');
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
  constraints,
  knownCompetitors,
  vocRaw,
  startDate,
  timezone,
}) {
  const sortedNodes = resolveAndSort(selectedNodes);
  const artifacts = {};

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

    // 4. Call LLM (with one retry on validation failure at temp 0)
    let output = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const callTemp = attempt === 0 ? temperature : 0;
        const llmResponse = await callLLM({
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt,
          temperature: callTemp,
          maxTokens,
        });

        // Extract text from {text, usage} response
        output = stripCodeFences(llmResponse.text);

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
  }

  // 7. All nodes done
  yield { type: 'complete', artifacts };
}
