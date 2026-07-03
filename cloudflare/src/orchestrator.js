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
    known_competitors: knownCompetitors?.trim() || 'NONE_PROVIDED — infer the most likely competitors from the category and include the status quo/manual process.',
    constraints: constraints?.trim() || 'NO_ADDITIONAL_CONSTRAINTS_PROVIDED — assume lean team, modest budget, and a 90-day execution horizon exactly as the prompt instructs.',
    voice_of_customer_raw: vocRaw?.trim() || 'NO_VOC_PROVIDED — derive hypotheses from the ICP and market research, set data_status to HYPOTHESIS_ONLY, and populate validation_plan.',
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

const REQUIRED_JSON_KEYS = {
  product_summary: ['one_liner', 'category', 'core_problem', 'job_to_be_done', 'key_capabilities', 'primary_outcome', 'product_type', 'assumptions'],
  brand_context: ['positioning_statement', 'positioning_approach', 'positioning_rationale', 'frame_of_reference', 'differentiators', 'brand_promise', 'emotional_territory', 'reasons_to_believe', 'assumptions'],
  brand_voice: ['voice_summary', 'traits', 'vocabulary', 'sentence_rules', 'tone_shifts'],
  icp: ['primary_segment', 'secondary_segment', 'disqualifiers', 'watering_holes', 'assumptions'],
  customer_insights: ['data_status', 'four_forces', 'sticky_phrases', 'moments_of_struggle', 'desired_outcomes', 'validation_plan'],
  channel_priorities: ['scored_channels', 'primary_plays', 'test_play', 'sequencing_note'],
  analytics_plan: ['north_star', 'supporting_metrics', 'utm_convention', 'events_to_track', 'dashboard_spec', 'setup_checklist', 'diagnostic_only'],
  seo_brief: ['seo_thesis', 'pillars', 'quick_wins', 'internal_linking_rule', 'validation_note', 'technical_basics'],
  blog_briefs: [],
  social_posts: [],
  email_sequence: ['sequence_name', 'sequence_type', 'entry_trigger', 'exit_condition', 'emails', 'ab_test_suggestion'],
  cro_recommendations: ['heuristic_scores', 'pre_launch_fixes', 'measurement_note'],
  social_posting_plan: [],
  content_backlog: [],
  execution_backlog: [],
  draft_queue: ['queue', 'queue_stats'],
  cron_manifest: ['machine_jobs', 'human_rituals', 'escalation_rule'],
};

const REQUIRED_MD_H2 = {
  market_research: ['## Market Definition', '## Market Size', '## Demand Signals', '## Market Dynamics', '## Buyer Behavior', '## Whitespace', '## Sources and Gaps'],
  competitor_intel: ['## Competitive Set', '## Battlecards', '## Positioning Whitespace', '## Recommended Counter-Positioning'],
  gtm_strategy: ['## Strategic Bet', '## Beachhead', '## Core Message', '## Motion and Funnel', '## 90-Day Sequence', '## Budget Allocation', '## Kill Criteria', '## Risks and Assumptions'],
  campaign_plan: ['## Campaign Concept', '## Audience and Offer', '## Message Architecture', '## Deliverables', '## Week-by-Week Rhythm', '## Success Metrics', '## Contingency'],
  landing_page_copy: ['## Hero', '## Problem agitation', '## Solution intro', '## How it works', '## Proof/objection handling', '## Secondary benefits', '## Final CTA', '## FAQ'],
};

function assertNonEmptyValue(value, path) {
  if (value === null || value === undefined) throw new Error(`Missing required value at ${path}`);
  if (typeof value === 'string' && !value.trim()) throw new Error(`Empty required string at ${path}`);
  if (Array.isArray(value) && value.length === 0) throw new Error(`Empty required array at ${path}`);
}

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

function validateOutput(nodeId, output, outputFormat) {
  // Failure tokens are valid structured responses — skip format validation
  if (isFailureToken(output)) return true;

  if (outputFormat === 'json') {
    const parsed = JSON.parse(output); // throws on invalid JSON
    const requiredKeys = REQUIRED_JSON_KEYS[nodeId] || [];
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error(`Missing required key: ${key}`);
      assertNonEmptyValue(parsed[key], key);
    }
    return true;
  }
  if (outputFormat === 'markdown') {
    const requiredSections = REQUIRED_MD_H2[nodeId] || [];
    if (!requiredSections.length) {
      if (!output.includes('#') && output.length < 120) {
        throw new Error('Markdown output missing expected structure');
      }
      return true;
    }
    for (const section of requiredSections) {
      if (!output.includes(section)) throw new Error(`Markdown output missing required section: ${section}`);
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

function deriveLogoDirection({ category = '', productDescription = '', emotionalTerritory = '', differentiators = [] }) {
  const haystack = `${category} ${productDescription} ${emotionalTerritory} ${differentiators.join(' ')}`.toLowerCase();

  if (/(clinic|medical|health|patient|hospital|doctor|care)/.test(haystack)) {
    return {
      style: 'calm trust, clinical precision, modern healthcare software, rounded geometry, clean spacing',
      motifs: ['appointment flow', 'calendar rhythm', 'care pathway', 'signal pulse', 'structured coordination'],
      avoid: ['fashion ornament', 'jewelry cues', 'gaming motifs', 'aggressive flames', 'luxury crests'],
      background: 'plain light neutral background',
    };
  }
  if (/(finance|fintech|payments|bank|billing|invoice|accounting)/.test(haystack)) {
    return {
      style: 'financial trust, precision, structured motion, modern infrastructure, crisp geometry',
      motifs: ['ledger grid', 'signal bars', 'secure flow', 'stable upward motion'],
      avoid: ['medical crosses', 'fashion flourishes', 'playful mascots'],
      background: 'plain light neutral background',
    };
  }
  if (/(fashion|apparel|jewelry|luxury|beauty|cosmetic|saree|wedding)/.test(haystack)) {
    return {
      style: 'editorial elegance, premium restraint, refined silhouette, high-end fashion identity',
      motifs: ['drape line', 'woven detail', 'gem facet', 'ornamental geometry'],
      avoid: ['medical symbols', 'dashboard charts', 'tech circuit motifs'],
      background: 'plain dark editorial background',
    };
  }
  if (/(developer|api|engineering|devops|infrastructure|workflow|automation|saas|software)/.test(haystack)) {
    return {
      style: 'modern software brand, modular precision, confident simplicity, strong silhouette',
      motifs: ['connected nodes', 'modular blocks', 'workflow loop', 'signal path'],
      avoid: ['fashion crests', 'healthcare cross', 'organic leaf marks unless product is sustainability-related'],
      background: 'plain neutral background',
    };
  }
  return {
    style: 'minimal modern brand system, clear silhouette, balanced geometry, premium restraint',
    motifs: ['abstract differentiator cue', 'simple geometric motion', 'recognizable symbol'],
    avoid: ['literal clip-art', 'random mascots', 'ornamental crests unrelated to the category'],
    background: 'plain neutral background',
  };
}

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
    const shouldUseSearchGrounding = provider === 'gemini' && ['market_research', 'competitor_intel'].includes(nodeId);
    const tools = shouldUseSearchGrounding ? [{ type: 'google_search' }] : [];

    // 4. Call LLM (with one retry — second attempt adds anti-fence instruction)
    let output = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const callTemp = attempt === 0 ? temperature : 0;
        // On retry, prepend a strong instruction to avoid code fences
        const retryPrefix = attempt > 0
          ? `CRITICAL: Output ONLY raw content. No markdown code fences (\`\`\`), no preamble, no commentary. If JSON, start with { or [. If markdown, start with #. Fix the exact previous validation issue: ${lastError?.message || 'invalid structure'}. Complete every required section and key.\n\n`
          : '';
        const llmResponse = await callLLM({
          provider,
          apiKey,
          model,
          systemPrompt,
          userPrompt: retryPrefix + userPrompt,
          temperature: callTemp,
          maxTokens,
          tools,
        });

        // Extract text from {text, usage} response
        output = stripCodeFences(llmResponse.text);

        // For JSON outputs, attempt repair of truncated responses
        if (outputFormat === 'json') {
          output = repairJSON(output);
        }

        // 5. Validate
        validateOutput(nodeId, output, outputFormat);

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
        const category = productData.category || '';
        const emotionalTerritory = brandData.emotional_territory || '';
        const differentiators = Array.isArray(brandData.differentiators) ? brandData.differentiators : [];
        const direction = deriveLogoDirection({
          category,
          productDescription,
          emotionalTerritory,
          differentiators,
        });

        // Build category-aware logo prompts
        const logoPrompt = `Design a brand symbol for ${brandName}. Symbol only. No words, no letters, no typography, no monogram text, no watermark, no mockup. The symbol must feel native to this category: ${category || 'the product category described below'}. Product description: ${productDescription}. Positioning: ${brandData.positioning_statement || productDescription}. Emotional territory: ${emotionalTerritory || 'clear confidence'}. Differentiators: ${differentiators.join('; ') || 'none explicitly provided'}. Style direction: ${direction.style}. Useful motif territory: ${direction.motifs.join(', ')}. Avoid: ${direction.avoid.join(', ')}. Output one clean isolated symbol on a ${direction.background}.`;
        const iconPrompt = `Design a compact app icon for ${brandName}. Abstract category-relevant symbol only, no text, no letters, no typography. It must stay recognizable at 64x64 pixels. Product description: ${productDescription}. Category: ${category}. Emotional territory: ${emotionalTerritory || 'clear confidence'}. Style direction: ${direction.style}. Useful motif territory: ${direction.motifs.join(', ')}. Avoid: ${direction.avoid.join(', ')}. Output one centered symbol on a ${direction.background}.`;

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
