/**
 * Multi-provider LLM text generation client for Cloudflare Workers.
 * Supports: Anthropic, OpenAI, Google Gemini, OpenRouter.
 * No npm dependencies — uses only the Fetch API.
 */

/**
 * Infer the LLM provider from an API key prefix.
 * @param {string} apiKey
 * @returns {'anthropic'|'openai'|'gemini'|'openrouter'|null}
 */
export function inferLLMProvider(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('sk-proj-') || apiKey.startsWith('sk-')) return 'openai';
  if (apiKey.startsWith('AIza')) return 'gemini';
  return null;
}

/**
 * Return the default reasoning-tier model for a given provider.
 * @param {string} provider
 * @returns {string|undefined}
 */
export function defaultModel(provider) {
  const models = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',
    openrouter: 'anthropic/claude-sonnet-4',
  };
  return models[provider];
}

/**
 * Return the default fast-tier model for a given provider.
 * @param {string} provider
 * @returns {string}
 */
export function defaultFastModel(provider) {
  const models = {
    anthropic: 'claude-haiku-4-20250414',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.5-flash',
    openrouter: 'anthropic/claude-haiku-4',
  };
  return models[provider] || 'gpt-4o-mini';
}

/**
 * Call an LLM provider and return generated text with usage info.
 * @param {Object} opts
 * @param {string} opts.provider - 'anthropic' | 'openai' | 'gemini' | 'openrouter'
 * @param {string} opts.apiKey
 * @param {string} [opts.model] - Falls back to defaultModel(provider)
 * @param {string} [opts.systemPrompt]
 * @param {string} opts.userPrompt
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxTokens=4096]
 * @returns {Promise<{text: string, usage: {inputTokens: number, outputTokens: number}}>}
 */
export async function callLLM({
  provider,
  apiKey,
  model,
  systemPrompt = '',
  userPrompt,
  temperature = 0.7,
  maxTokens = 4096,
  tools = [],
}) {
  const resolvedModel = model || defaultModel(provider);

  if (provider === 'anthropic') {
    return callAnthropic({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens, tools });
  }
  if (provider === 'openai') {
    return callOpenAI({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens, tools });
  }
  if (provider === 'gemini') {
    return callGemini({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens, tools });
  }
  if (provider === 'openrouter') {
    return callOpenRouter({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens, tools });
  }

  throw new Error(`Unsupported LLM provider: ${provider}. Use anthropic, openai, gemini, or openrouter.`);
}

/* ------------------------------------------------------------------ */
/*  Provider implementations                                          */
/* ------------------------------------------------------------------ */

async function callAnthropic({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens }) {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    text: data.content?.[0]?.text ?? '',
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    },
  };
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens }) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model,
    temperature,
    max_completion_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens, tools = [] }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
    tools: tools.length ? tools : undefined,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

async function callOpenRouter({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens }) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://arjun-marketing-os.srksourabh.workers.dev',
      'X-Title': 'Arjun Marketing OS',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
