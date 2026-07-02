/**
 * Multi-provider LLM text generation client for Cloudflare Workers.
 * No npm dependencies — uses only the Fetch API.
 */

/**
 * Infer the LLM provider from an API key prefix.
 * @param {string} apiKey
 * @returns {'anthropic'|'openai'|'gemini'|null}
 */
export function inferLLMProvider(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';
  if (apiKey.startsWith('AIza')) return 'gemini';
  return null;
}

/**
 * Return the default model for a given provider.
 * @param {string} provider
 * @returns {string|undefined}
 */
export function defaultModel(provider) {
  const models = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',
  };
  return models[provider];
}

/**
 * Call an LLM provider and return generated text with usage info.
 * @param {Object} opts
 * @param {string} opts.provider - 'anthropic' | 'openai' | 'gemini'
 * @param {string} opts.apiKey
 * @param {string} [opts.model] - Falls back to defaultModel(provider)
 * @param {string} [opts.systemPrompt]
 * @param {string} opts.userPrompt
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxTokens=1024]
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
}) {
  const resolvedModel = model || defaultModel(provider);

  if (provider === 'anthropic') {
    return callAnthropic({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens });
  }
  if (provider === 'openai') {
    return callOpenAI({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens });
  }
  if (provider === 'gemini') {
    return callGemini({ apiKey, model: resolvedModel, systemPrompt, userPrompt, temperature, maxTokens });
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

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

  if (res.status !== 200) {
    const errBody = await res.text();
    throw new Error(`anthropic error ${res.status}: ${errBody.slice(0, 300)}`);
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
    },
    body: JSON.stringify(body),
  });

  if (res.status !== 200) {
    const errBody = await res.text();
    throw new Error(`openai error ${res.status}: ${errBody.slice(0, 300)}`);
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

async function callGemini({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status !== 200) {
    const errBody = await res.text();
    throw new Error(`gemini error ${res.status}: ${errBody.slice(0, 300)}`);
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
