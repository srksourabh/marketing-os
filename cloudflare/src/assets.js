import { primaryCta, northStarMetric, buildHashtags, isFashionProduct } from './strategy.js';
import { escapeHtml } from './utils.js';

export async function buildAssets(product, brand, strategy, campaignPlan, imageProvider, imageRuntime) {
  const socialChannel = strategy.channelPriorities[0]?.channel || 'linkedin';
  const logoSvg = buildLogoSvg(product, brand);
  const iconSvg = buildIconSvg(product, brand);
  const hashtags = buildHashtags(product);
  const fashion = isFashionProduct(product);
  const logoPrompt = fashion
    ? `${imageProvider.label}: create a premium emblem logo concept for ${product.name}. Symbol only, no words, no letters, no typography. Draw from silk weave, drape flow, zari detail, heritage luxury, and refined Indian occasionwear. Use elegant geometry, rich contrast, and premium restraint. Palette anchor: ${brand.colors.map((c) => c.hex).join(', ')}. Brand positioning: ${brand.positioningCore}.`
    : `${imageProvider.label}: create a premium logo for ${product.name}. Symbol-first concept, avoid readable words or letters, no watermark. Style: dark-luxury minimalism, geometric mark, high contrast. Brand positioning: ${brand.positioningCore}. Brand vision: ${brand.vision}. Palette anchor: ${brand.colors.map((c) => c.hex).join(', ')}.`;
  const moodboardPrompt = fashion
    ? `${imageProvider.label}: create a 4-panel brand moodboard for ${product.name} showing silk texture, drape movement, festive styling cues, premium packaging, and aspirational occasionwear art direction. Audience: ${product.audience}. Market position: ${strategy.marketPositioning}.`
    : `${imageProvider.label}: create a 4-panel brand moodboard for ${product.name} showing interface cues, product-world textures, premium color palette, and buyer aspiration. Audience: ${product.audience}. Market position: ${strategy.marketPositioning}.`;
  const socialCreativePrompt = fashion
    ? `${imageProvider.label}: create a premium ${socialChannel} social creative for ${product.name}. No random English text. Focus on silk texture, elegant folds, festive luxury, premium product framing, rich color depth, and clean composition for fashion discovery.`
    : `${imageProvider.label}: create a premium ${socialChannel} social creative for ${product.name}. No random English text. Focus on product value, premium editorial composition, abstract proof cues, premium typography space, and brand palette ${brand.colors.map((c) => c.hex).join(', ')}.`;
  const logoVariantPrompts = [
    `${logoPrompt} Variant direction: iconic monogram-first symbol for favicon, app icon, and avatar use.`,
    `${logoPrompt} Variant direction: geometric editorial emblem with a more luxurious silhouette.`,
  ];
  const socialVariantPrompts = [
    `${socialCreativePrompt} Variant direction: bold single-image hero with one focal product frame.`,
    `${socialCreativePrompt} Variant direction: premium editorial card with contrast, texture, and gifting cues.`,
  ];
  const generatedImages = await generateVisualAssets({ product, logoPrompt, moodboardPrompt, socialCreativePrompt, logoVariantPrompts, socialVariantPrompts, imageRuntime, imageProvider });

  const socialPosts = fashion ? [
    {
      id: 'social-1',
      channel: socialChannel,
      hook: `Not all silk sarees feel premium the moment you see them. This one should.`,
      body: `${product.name} should lead with what premium buyers actually look for: craftsmanship, drape, occasion fit, and confidence that the piece will feel special in real life, not just in a catalog tile.`,
      cta: 'Explore the occasion edit.',
      hashtags,
      creativeDirection: 'Luxury editorial single-image post with one hero saree frame, rich fabric texture, and premium negative space.',
      imagePrompt: socialVariantPrompts[0],
    },
    {
      id: 'social-2',
      channel: socialChannel,
      hook: `What makes a festive saree worth the premium?`,
      body: `The answer is rarely more embroidery alone. It is authenticity, weave richness, styling confidence, and the feeling that the product will look refined across the full occasion journey — photos, ceremony, and repeat wear.`,
      cta: 'Save this for your next wedding-season shortlist.',
      hashtags,
      creativeDirection: 'Carousel with craftsmanship close-up, drape shot, occasion styling cue, and premium trust note.',
      imagePrompt: socialVariantPrompts[1],
    },
    {
      id: 'social-3',
      channel: socialChannel,
      hook: `Premium ethnic fashion wins when the product story feels as considered as the garment.`,
      body: `Anchor the brand around ${product.differentiators.join(', ')}. Show the weave, the finish, the styling logic, and the occasion relevance. That is what separates a premium label from generic festive inventory.`,
      cta: 'Discover the signature collection.',
      hashtags,
      creativeDirection: 'Premium brand card with heritage-inspired motif, styling notes, and one elegant product focal point.',
      imagePrompt: socialVariantPrompts[1],
    },
  ] : [
    {
      id: 'social-1',
      channel: socialChannel,
      hook: `Most teams do not have a lead problem. They have a trust-to-conversion problem.`,
      body: `${product.name} helps ${product.audience} solve ${product.problem} without adding more operational drag. The positioning move is simple: stop listing features and start proving commercial outcomes.`,
      cta: primaryCta(product.businessModel),
      hashtags,
      creativeDirection: 'Dark premium card with one proof statistic and one brutal buying truth.',
      imagePrompt: socialVariantPrompts[0],
    },
    {
      id: 'social-2',
      channel: socialChannel,
      hook: `Why buyers stall before conversion`,
      body: `Because the message is vague, the proof arrives late, and the CTA asks for too much too early. ${product.name} should lead with clarity, proof, and a next step that feels earned.`,
      cta: 'Comment “audit” for the teardown version.',
      hashtags,
      creativeDirection: 'Carousel: friction, proof gap, fix, CTA map.',
      imagePrompt: socialVariantPrompts[1],
    },
    {
      id: 'social-3',
      channel: socialChannel,
      hook: `What makes ${product.name} different is not the tool. It is the operating advantage.`,
      body: `Anchor the story around ${product.differentiators.join(', ')}. Translate each into one business outcome. That is what makes the brand feel premium instead of noisy.`,
      cta: 'Save this for the next positioning review.',
      hashtags,
      creativeDirection: 'Single-image post with brand colors, logo mark, and three differentiator blocks.',
      imagePrompt: socialVariantPrompts[1],
    },
  ];
  const emailSequence = [
    {
      stage: 'Email 1',
      subject: `${product.name}: the cleaner path to solving ${product.problem}`,
      purpose: 'Reframe the core pain commercially.',
      body: `If the current workflow keeps leaking time, attention, or revenue, the fix is rarely more effort. It is better system design. ${product.name} gives ${product.audience} a cleaner operating path with more visibility and less drag.`,
    },
    {
      stage: 'Email 2',
      subject: `What serious buyers ask before switching`,
      purpose: 'Neutralize risk and adoption objections.',
      body: `Good buyers ask hard questions: integration, adoption, ROI, proof. Answer those directly. Show the before/after. Remove ambiguity before you ask for commitment.`,
    },
    {
      stage: 'Email 3',
      subject: `The next step if the current process is costing growth`,
      purpose: 'Drive one concrete CTA.',
      body: `Do not stack five actions. Ask for one clean move: ${primaryCta(product.businessModel)}. Pair it with proof and urgency that feels earned, not theatrical.`,
    },
  ];

  const landingPage = [
    { title: 'Hero', copy: `${brand.tagline}. Built for ${product.audience} that need ${product.problem} solved with less noise.` },
    { title: 'Proof strip', copy: `Lead with three proof blocks: ${product.proofPoints.join(', ')}.` },
    { title: 'Differentiation', copy: `Translate ${product.differentiators.join(', ')} into business outcomes.` },
    { title: 'CTA', copy: primaryCta(product.businessModel) },
  ];

  return {
    logoSvg,
    iconSvg,
    logoPrompt,
    moodboardPrompt,
    socialCreativePrompt,
    logoVariantPrompts,
    socialVariantPrompts,
    imageProvider,
    generatedImages,
    hashtags,
    socialPosts,
    emailSequence,
    landingPage,
    seoBrief: {
      primaryKeyword: `best ${product.category} for ${product.problem}`,
      secondaryKeywords: [`${product.name} alternatives`, `${product.category} buyer guide`, `how to solve ${product.problem}`],
      searchIntent: 'commercial investigation',
      outline: ['Problem framing', 'Decision criteria', 'Competitor gap', 'Proof architecture', 'CTA'],
    },
    blogBriefs: [
      {
        title: `How to solve ${product.problem} without creating more operational overhead`,
        angle: 'CEO + operator education piece',
        cta: primaryCta(product.businessModel),
      },
      {
        title: `${product.name} vs common alternatives: what actually matters when buying`,
        angle: 'comparison content for high-intent buyers',
        cta: 'Move the reader to an audit or demo.',
      },
    ],
    croRecommendations: strategy.cro.experiments,
    analyticsPlan: {
      northStarMetric: northStarMetric(product.businessModel),
      scorecard: ['qualified pipeline', 'demo rate', 'lead-to-opportunity', 'close rate', 'payback period'],
      reportingRhythm: 'weekly ops review + monthly board memo',
    },
    socialPostingPlan: {
      cadence: '3 posts/week',
      channels: [socialChannel],
      mix: ['pain-point POV', 'proof', 'objection handling', 'CTA'],
    },
    contentBacklog: [
      ...campaignPlan.phasePlan.map((item) => ({ title: item.focus, status: 'planned', outputs: item.outputs })),
      { title: 'Case study narrative', status: 'planned', outputs: ['hero proof section', 'email proof insert'] },
      { title: 'Comparison page refresh', status: 'planned', outputs: ['SEO page', 'sales enablement asset'] },
    ],
    executionBacklog: [
      { owner: 'brand', task: 'Lock brand palette, logo, and motion rules', status: 'next' },
      { owner: 'research', task: 'Expand category map, intent clusters, and competitor grid', status: 'planned' },
      { owner: 'content', task: 'Ship first social trio, 2 blogs, and email sequence', status: 'planned' },
      { owner: 'cro', task: 'Implement proof-first hero and CTA-path test', status: 'planned' },
    ],
    draftQueue: {
      status: 'awaiting_approval',
      items: [
        ...socialPosts.map((item) => ({ type: 'social', id: item.id, status: 'draft' })),
        ...emailSequence.map((item) => ({ type: 'email', id: item.stage, status: 'draft' })),
      ],
    },
    cronManifest: '# Operating Rhythm\n\n- Daily: monitor search intent, pull proof snippets, refresh draft queue\n- Weekly: publish 3 posts, 1 email, 1 conversion improvement task\n- Monthly: board-style review of channel ROI, wins, losses, and next bets\n',
  };
}

export function resolveImageGenerationConfig(payload = {}, env = {}) {
  const byok = payload?.byok || {};
  const rawKey = String(byok.api_key || payload.api_key || '').trim();
  const inferredProvider = inferProviderFromKey(rawKey);
  const requestedProvider = normalizeProvider(byok.provider || payload.image_provider || inferredProvider || '');

  if (rawKey && requestedProvider) {
    return {
      key: requestedProvider,
      apiKey: rawKey,
      ready: true,
      source: 'byok',
    };
  }

  if (env.GEMINI_API_KEY) {
    return {
      key: 'gemini',
      apiKey: env.GEMINI_API_KEY,
      ready: true,
      source: 'server',
    };
  }

  if (env.OPENAI_API_KEY) {
    return {
      key: 'openai',
      apiKey: env.OPENAI_API_KEY,
      ready: true,
      source: 'server',
    };
  }

  return {
    key: requestedProvider || 'prompt-only',
    apiKey: '',
    ready: false,
    source: 'prompt-only',
  };
}

export function detectImageProvider(imageRuntime = {}) {
  if (imageRuntime.key === 'gemini' && imageRuntime.ready) {
    return { key: 'gemini', label: 'Gemini 3.1 Flash Image', ready: true, source: imageRuntime.source, byok: imageRuntime.source === 'byok' };
  }
  if (imageRuntime.key === 'openai' && imageRuntime.ready) {
    return { key: 'openai', label: 'OpenAI gpt-image-1', ready: true, source: imageRuntime.source, byok: imageRuntime.source === 'byok' };
  }
  if (imageRuntime.key === 'gemini' || imageRuntime.key === 'openai') {
    return { key: imageRuntime.key, label: imageRuntime.key === 'gemini' ? 'Gemini 3.1 Flash Image' : 'OpenAI gpt-image-1', ready: false, source: 'prompt-only', byok: false };
  }
  return { key: 'prompt-only', label: 'Nano/Banana/OpenAI/Gemini-ready prompt pack', ready: false, source: 'prompt-only', byok: false };
}

export async function generateVisualAssets({ product, logoPrompt, moodboardPrompt, socialCreativePrompt, logoVariantPrompts = [], socialVariantPrompts = [], imageRuntime, imageProvider }) {
  if (!imageRuntime?.ready || !imageRuntime?.apiKey) {
    return { logo: null, moodboard: null, social: null, logoVariants: [], socialVariants: [], provider: imageProvider.key, source: imageProvider.source };
  }

  const generator = imageRuntime.key === 'openai'
    ? (prompt) => generateOpenAiImage(imageRuntime.apiKey, prompt)
    : (prompt) => generateGeminiImage(imageRuntime.apiKey, prompt);

  const [moodboard, ...variantResults] = await Promise.allSettled([
    generator(moodboardPrompt),
    ...logoVariantPrompts.map((prompt) => generator(prompt)),
    ...socialVariantPrompts.map((prompt) => generator(prompt)),
  ]);

  const logoVariants = variantResults.slice(0, logoVariantPrompts.length).filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const socialVariants = variantResults.slice(logoVariantPrompts.length).filter((item) => item.status === 'fulfilled').map((item) => item.value);

  return {
    logo: logoVariants[0] || null,
    moodboard: moodboard.status === 'fulfilled' ? moodboard.value : null,
    social: socialVariants[0] || null,
    logoVariants,
    socialVariants,
    provider: imageRuntime.key,
    source: imageRuntime.source,
    product: product.slug,
  };
}

export async function generateGeminiImage(apiKey, prompt) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini image generation failed: ${response.status} ${detail.slice(0, 240)}`);
  }

  const data = await response.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data || !inlineData?.mimeType) {
    throw new Error('Gemini did not return image bytes.');
  }

  return {
    mimeType: inlineData.mimeType,
    base64: inlineData.data,
    prompt,
  };
}

export async function generateOpenAiImage(apiKey, prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${detail.slice(0, 240)}`);
  }

  const data = await response.json();
  const image = data?.data?.[0];
  if (!image?.b64_json) {
    throw new Error('OpenAI did not return image bytes.');
  }

  return {
    mimeType: 'image/png',
    base64: image.b64_json,
    prompt,
  };
}

export function normalizeProvider(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'gemini' || normalized === 'openai') return normalized;
  return '';
}

export function inferProviderFromKey(apiKey) {
  if (!apiKey) return '';
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-')) return 'openai';
  return '';
}

export function dataUri(image) {
  return `data:${image.mimeType};base64,${image.base64}`;
}

export function buildLogoSvg(product, brand) {
  const [dark, primary, accent] = [brand.colors[0].hex, brand.colors[1].hex, brand.colors[2].hex];
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320" fill="none">
    <rect width="1200" height="320" rx="40" fill="${dark}"/>
    <rect x="44" y="44" width="232" height="232" rx="58" fill="url(#grad)"/>
    <circle cx="160" cy="160" r="74" fill="rgba(255,255,255,0.12)"/>
    <path d="M112 198V122h44c35 0 55 13 55 38 0 18-10 30-28 36l34 43h-40l-28-37h-11v37h-26Zm26-57h18c18 0 28-6 28-18 0-12-10-18-28-18h-18v36Z" fill="white"/>
    <path d="M180 204l58-82h28l-58 82h-28Z" fill="${accent}" opacity="0.9"/>
    <text x="336" y="156" fill="white" font-size="88" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeHtml(product.name)}</text>
    <text x="336" y="212" fill="${primary}" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="600">${escapeHtml(brand.tagline)}</text>
    <defs>
      <linearGradient id="grad" x1="44" y1="44" x2="276" y2="276" gradientUnits="userSpaceOnUse">
        <stop stop-color="${primary}"/>
        <stop offset="1" stop-color="${accent}"/>
      </linearGradient>
    </defs>
  </svg>`.trim();
}

export function buildIconSvg(product, brand) {
  const initialsText = escapeHtml(product.initials || product.name.slice(0, 2).toUpperCase());
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <rect width="320" height="320" rx="72" fill="${brand.colors[0].hex}"/>
    <rect x="28" y="28" width="264" height="264" rx="56" fill="url(#grad)"/>
    <circle cx="160" cy="160" r="82" fill="rgba(255,255,255,0.12)"/>
    <text x="160" y="186" text-anchor="middle" fill="white" font-size="110" font-family="Inter, Arial, sans-serif" font-weight="800">${initialsText}</text>
    <defs>
      <linearGradient id="grad" x1="28" y1="28" x2="292" y2="292" gradientUnits="userSpaceOnUse">
        <stop stop-color="${brand.colors[1].hex}"/>
        <stop offset="1" stop-color="${brand.colors[2].hex}"/>
      </linearGradient>
    </defs>
  </svg>`.trim();
}
