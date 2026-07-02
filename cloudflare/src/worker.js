const DELIVERABLE_OPTIONS = [
  { id: 'ceo_market_report', label: 'CEO-grade market report' },
  { id: 'brand_identity_suite', label: 'Brand identity suite' },
  { id: 'logo_pack', label: 'Logo pack' },
  { id: 'product_summary', label: 'Product summary' },
  { id: 'brand_context', label: 'Brand context' },
  { id: 'brand_voice', label: 'Brand voice' },
  { id: 'icp', label: 'Ideal customer profile' },
  { id: 'market_research', label: 'Market research' },
  { id: 'customer_insights', label: 'Customer insights' },
  { id: 'competitor_intel', label: 'Competitor intelligence' },
  { id: 'gtm_strategy', label: 'Go-to-market strategy' },
  { id: 'channel_priorities', label: 'Channel priorities' },
  { id: 'campaign_plan', label: 'Campaign plan' },
  { id: 'seo_brief', label: 'SEO brief' },
  { id: 'blog_briefs', label: 'Blog briefs' },
  { id: 'social_posts', label: 'Social content' },
  { id: 'email_sequence', label: 'Email sequence' },
  { id: 'landing_page_copy', label: 'Landing page copy' },
  { id: 'cro_recommendations', label: 'CRO recommendations' },
  { id: 'analytics_plan', label: 'Analytics plan' },
  { id: 'social_posting_plan', label: 'Social posting plan' },
  { id: 'content_backlog', label: 'Content backlog' },
  { id: 'execution_backlog', label: 'Execution backlog' },
  { id: 'draft_queue', label: 'Draft queue' },
  { id: 'cron_manifest', label: 'Operating rhythm / cron manifest' },
  { id: 'content_gen_prompt', label: 'Content generation prompt' },
  { id: 'master_board_pack', label: 'Master board pack' },
  { id: 'full_pack_bundle', label: 'Full pack ZIP bundle' },
];

const OPTION_INDEX = Object.fromEntries(DELIVERABLE_OPTIONS.map((item) => [item.id, item.label]));
const ANALYSIS_FIRST_SEQUENCE = ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite', 'logo_pack', 'social_posts'];
const DELIVERABLE_DEPENDENCIES = {
  brand_identity_suite: ['market_research', 'competitor_intel', 'customer_insights'],
  logo_pack: ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite'],
  social_posts: ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite', 'logo_pack'],
};
const TEXT_ENCODER = new TextEncoder();

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

async function buildExperience(payload, env) {
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();
  const objective = String(payload.objective || 'Create a premium brand system and a board-ready marketing growth pack').trim();
  const requestedItems = payload.selected_items;
  const selectedItems = normalizeSelectedItems(requestedItems);
  const imageProvider = detectImageProvider(env);

  if (!name || !description) {
    throw new Error('Add product name and description.');
  }

  const product = inferProduct(name, description);
  const brand = buildBrandSystem(product);
  const strategy = buildStrategy(product, brand);
  const campaignPlan = buildCampaignPlan(product, objective);
  const assets = await buildAssets(product, brand, strategy, campaignPlan, imageProvider, env);
  const deliverableMap = buildDeliverableMap(product, brand, strategy, campaignPlan, assets);

  const selectedOutputs = selectedItems.map((itemId) => {
    const artifact = deliverableMap[itemId];
    return {
      id: itemId,
      label: OPTION_INDEX[itemId],
      format: artifact.format,
      category: artifact.category,
      preview: artifact.preview,
      preview_html: artifact.previewHtml,
      downloads: artifact.downloads.map((download) => ({
        label: download.label,
        filename: download.filename,
        mime_type: download.mimeType,
        action: download.action || 'download',
        base64: download.base64 || arrayBufferToBase64(TEXT_ENCODER.encode(download.content)),
      })),
    };
  });

  return {
    slug: product.slug,
    product_name: product.name,
    product_dir: `cloudflare://marketing-os/${product.slug}`,
    image_provider: imageProvider,
    generation_flow: ANALYSIS_FIRST_SEQUENCE.map((id, index) => ({
      step: index + 1,
      id,
      label: OPTION_INDEX[id],
    })),
    auto_added_dependencies: selectedItems.filter((item) => !requestedItems.includes(item)),
    brand_snapshot: {
      tagline: brand.tagline,
      vision: brand.vision,
      color_palette: brand.colors.map((color) => color.hex),
      voice: brand.voicePillars,
    },
    selected_outputs: selectedOutputs,
  };
}

function inferProduct(name, description) {
  const brief = description.trim();
  const category = inferCategory(brief);
  const problem = inferProblem(brief);
  const audience = inferAudience(brief);
  const businessModel = inferBusinessModel(brief, category);
  const channels = inferChannels(brief, businessModel);
  const differentiators = inferDifferentiators(brief, category);
  const proofPoints = ['customer outcome delta', 'workflow clarity', 'before/after evidence'];
  const goals = ['increase qualified demand', 'improve conversion quality', 'build repeatable growth loops'];
  return {
    slug: slugify(name),
    name,
    initials: initials(name),
    briefDescription: brief,
    category,
    problem,
    audience,
    businessModel,
    channels,
    differentiators,
    proofPoints,
    goals,
    messagingPillars: [
      `Solve ${problem}`,
      `Differentiate with ${differentiators.join(', ')}`,
      `Prove value using ${proofPoints.join(', ')}`,
    ],
  };
}

function enrichDeliverableOption(item) {
  const dependencies = DELIVERABLE_DEPENDENCIES[item.id] || [];
  const stageIndex = ANALYSIS_FIRST_SEQUENCE.indexOf(item.id);
  return {
    ...item,
    workflow_stage: stageIndex === -1 ? null : stageIndex + 1,
    dependencies,
    analysis_first: stageIndex !== -1,
  };
}

function normalizeSelectedItems(selectedItems = []) {
  const selected = new Set(selectedItems.filter((item) => OPTION_INDEX[item]));
  const queue = [...selected];
  while (queue.length) {
    const current = queue.shift();
    for (const dependency of DELIVERABLE_DEPENDENCIES[current] || []) {
      if (!selected.has(dependency)) {
        selected.add(dependency);
        queue.push(dependency);
      }
    }
  }
  const ordered = [];
  for (const id of ANALYSIS_FIRST_SEQUENCE) {
    if (selected.has(id)) ordered.push(id);
  }
  for (const item of selectedItems) {
    if (selected.has(item) && !ordered.includes(item)) ordered.push(item);
  }
  for (const item of selected) {
    if (!ordered.includes(item)) ordered.push(item);
  }
  return ordered;
}

function buildBrandSystem(product) {
  const palette = buildPalette(product);
  const archetype = inferArchetype(product);
  const tagline = buildTagline(product);
  const fashion = isFashionProduct(product);
  const positioningCore = fashion
    ? `${product.name} is the premium ${product.category} label for ${product.audience}, bringing ${product.problem} together with craftsmanship, cultural richness, and elevated styling confidence.`
    : `${product.name} is the premium ${product.category} brand for ${product.audience} who need ${product.problem} solved with proof, speed, and operational confidence.`;
  const brandVoice = fashion
    ? [
      'elegant without sounding distant',
      'rooted in craftsmanship and cultural credibility',
      `speaks directly to ${product.audience}`,
      'specific, premium, and visually evocative',
    ]
    : [
      'clear enough for a board update',
      'confident without startup cosplay',
      `speaks directly to ${product.audience}`,
      'specific, proof-led, commercially literate',
    ];
  return {
    archetype,
    tagline,
    promise: fashion
      ? `${product.name} helps ${product.audience} find ${product.problem} with greater confidence in quality, beauty, and occasion-fit.`
      : `${product.name} helps ${product.audience} solve ${product.problem} with less friction and more control.`,
    essence: fashion
      ? `${product.category} built on authenticity, elegance, and occasion-ready confidence.`
      : `${product.category} growth system built for credibility and measurable outcomes.`,
    vision: fashion
      ? `Become the most trusted ${product.category} for ${product.audience}, known for authentic craftsmanship, refined styling, and heirloom-worthy appeal.`
      : `Become the most trusted ${product.category} growth platform for ${product.audience}, known for turning ${product.problem} into an operating advantage.`,
    mission: fashion
      ? `Help ${product.audience} discover beautifully crafted pieces that feel timeless, premium, and deeply wearable.`
      : `Give ${product.audience} a cleaner, faster, and more commercially reliable way to win.`,
    positioningCore,
    marketPositioning: fashion
      ? 'premium heritage-led fashion label with modern presentation, stronger trust cues, and more occasion-specific desirability than generic marketplace sellers'
      : 'premium-performance niche player with sharper proof and a more operator-friendly experience than broad incumbents',
    reasonsToBelieve: fashion
      ? ['authentic craftsmanship and textile quality', 'distinctive styling rooted in heritage', 'premium presentation that fits gifting and occasion buying']
      : ['clear before/after proof framing', 'faster time-to-value than bloated incumbents', 'operator-friendly workflow design'],
    tonalSliders: fashion
      ? [['luxurious', 'approachable'], ['heritage', 'modern'], ['ornate', 'refined']]
      : [['premium', 'practical'], ['strategic', 'clear'], ['modern', 'credible']],
    voicePillars: brandVoice,
    colors: palette,
    typography: {
      headline: 'Inter Tight / system sans',
      body: 'Inter / system sans',
      accent: 'IBM Plex Mono / ui-monospace',
    },
  };
}

function buildStrategy(product, brand) {
  const socialChannel = product.channels.find((channel) => !['seo', 'email'].includes(channel)) || 'linkedin';
  const customer = customerInsights(product);
  const competitor = competitorIntel(product);
  const market = marketResearch(product);
  const cro = croInsights();
  const stp = {
    segmentation: [
      `${product.audience} with acute pain around ${product.problem}`,
      `mid-market buyers prioritizing proof, speed, and ROI visibility`,
      `teams replacing fragmented manual workflows`,
    ],
    targeting: `Prioritize ${product.audience} that already feel the cost of ${product.problem} and can buy on commercial logic, not curiosity.`,
    positioning: brand.positioningCore,
  };
  return {
    positioningStatement: `${product.name} is the ${product.category} choice for ${product.audience} that need ${product.problem} solved without adding operational drag.`,
    marketPositioning: `${product.name} should occupy the premium, proof-led position between bloated incumbents and underpowered niche tools.`,
    valueProps: product.messagingPillars,
    campaignThemes: ['pain-point clarity', 'proof-led differentiation', 'commercial confidence'],
    opportunities: [
      `Own the trust narrative in ${product.category}.`,
      market.channelOpportunities[0],
      `Directly neutralize the objection: ${customer.objections[0]}`,
      competitor.differentiationAngles[0],
      `Run CRO experiment: ${cro.experiments[0].name}`,
    ],
    gtmMotion: gtmMotion(product.businessModel),
    funnelSummary: [
      'Acquire through high-intent search and authority content',
      'Capture with conversion-aware proof and one clean CTA',
      'Convert with objection handling, demos, and lifecycle follow-up',
      'Retain through reporting, adoption prompts, and expansion stories',
    ],
    channelPriorities: product.channels.slice(0, 4).map((channel, index) => ({
      rank: index + 1,
      channel,
      whyNow: {
        seo: 'compounds demand capture and commercial-intent discovery',
        email: 'turns captured attention into pipeline and retention',
        linkedin: 'best channel for proof, founder POV, and operator trust',
        instagram: 'best for branded proof, lifestyle framing, and short-form reach',
        youtube: 'best for authority and deep education',
        social: 'keeps the brand visible and multiplies proof assets',
      }[channel] || 'supports awareness and deal progression when paired with proof',
    })),
    stp,
    market,
    customer,
    competitor,
    cro,
    brand,
  };
}

function buildCampaignPlan(product, objective) {
  return {
    objective,
    calendarWeeks: 12,
    phasePlan: [
      { phase: 'Weeks 1-2', focus: 'Positioning lock, asset system, proof architecture', outputs: ['brand story', 'landing page hero', 'logo + palette'] },
      { phase: 'Weeks 3-6', focus: 'Demand capture and proof distribution', outputs: ['social series', 'SEO pieces', 'email sequence'] },
      { phase: 'Weeks 7-9', focus: 'Conversion lift and funnel tuning', outputs: ['CRO tests', 'offer framing', 'objection assets'] },
      { phase: 'Weeks 10-12', focus: 'Performance review and scale decisions', outputs: ['board update', 'channel scorecard', 'next-quarter bets'] },
    ],
    experiments: [
      'Proof-first hero vs pain-first hero',
      'Audit CTA vs demo CTA',
      'Founder POV post vs customer proof post',
    ],
    funnelStages: [
      { stage: 'awareness', goal: 'attract qualified attention', owner: 'research + content' },
      { stage: 'consideration', goal: 'build trust and capture leads', owner: 'content + lifecycle' },
      { stage: 'conversion', goal: 'turn intent into revenue', owner: 'CRO + sales enablement' },
      { stage: 'retention', goal: 'expand value and referrals', owner: 'analytics + lifecycle' },
    ],
  };
}

async function buildAssets(product, brand, strategy, campaignPlan, imageProvider, env) {
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
  const generatedImages = await generateVisualAssets({ product, logoPrompt, moodboardPrompt, socialCreativePrompt, logoVariantPrompts, socialVariantPrompts, env, imageProvider });

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

function buildDeliverableMap(product, brand, strategy, campaignPlan, assets) {
  const reportHtml = buildCeoReportHtml(product, brand, strategy, campaignPlan, assets);
  const brandHtml = buildBrandSuiteHtml(product, brand, assets);
  const logoGuideHtml = buildLogoGuideHtml(product, brand, assets);
  const socialHtml = buildSocialHtml(product, brand, assets);
  const competitorHtml = buildCompetitorHtml(product, brand, strategy);
  const marketHtml = buildMarketHtml(product, brand, strategy);
  const gtmHtml = buildGtmHtml(product, brand, strategy, campaignPlan);
  const emailHtml = buildEmailHtml(product, brand, assets);
  const landingHtml = buildLandingHtml(product, brand, assets);
  const analyticsHtml = buildAnalyticsHtml(product, brand, assets);
  const backlogHtml = buildBacklogHtml(product, brand, assets);
  const contentPrompt = buildContentPrompt(product, brand, strategy, assets);

  const deliverables = {
    ceo_market_report: richDocArtifact({ title: `${product.name} CEO Growth Brief`, category: 'Board pack', summary: 'Board-ready market research, competition landscape, GTM strategy, and a 90-day operating plan.', html: reportHtml, filenameBase: `${product.slug}-ceo-growth-brief` }),
    brand_identity_suite: richDocArtifact({ title: `${product.name} Brand Identity Suite`, category: 'Brand system', summary: `${brand.tagline} Includes palette, typography, voice rules, messaging, and usage guidance.`, html: brandHtml, filenameBase: `${product.slug}-brand-identity-suite`, extraDownloads: assets.generatedImages.moodboard ? [imageDownload('Download Gemini Moodboard PNG', `${product.slug}-brand-moodboard.png`, assets.generatedImages.moodboard)] : [] }),
    logo_pack: logoArtifact(product, brand, assets, logoGuideHtml),
    product_summary: richDocArtifact({ title: `${product.name} Product Summary`, category: 'Product narrative', summary: `${product.name} positioning, commercial promise, and buyer-facing summary in one clean page.`, html: simpleDocHtml(`${product.name} Product Summary`, htmlList([
      [`Category`, product.category],
      [`Audience`, product.audience],
      [`Problem solved`, product.problem],
      [`Business model`, product.businessModel],
      [`Messaging pillars`, product.messagingPillars.join(' • ')],
    ]), brand), filenameBase: `${product.slug}-product-summary` }),
    brand_context: richDocArtifact({ title: `${product.name} Brand Context`, category: 'Brand strategy', summary: `${product.name} brand context, commercial backdrop, and differentiation logic.`, html: simpleDocHtml(`${product.name} Brand Context`, `<p>${brand.promise}</p><p>${brand.essence}</p><p>Core differentiators: ${escapeHtml(product.differentiators.join(', '))}.</p>`, brand), filenameBase: `${product.slug}-brand-context` }),
    brand_voice: richDocArtifact({ title: `${product.name} Brand Voice`, category: 'Messaging system', summary: 'Voice pillars, do/don’t guidance, and example messaging lines.', html: buildVoiceHtml(product, brand), filenameBase: `${product.slug}-brand-voice` }),
    icp: richDocArtifact({ title: `${product.name} Ideal Customer Profile`, category: 'Audience', summary: 'Primary buyer, core pain points, objections, and purchase triggers.', html: buildIcpHtml(product, brand, strategy), filenameBase: `${product.slug}-ideal-customer-profile` }),
    market_research: richDocArtifact({ title: `${product.name} Market Research`, category: 'Research', summary: 'Whitespace, trends, and channel opportunities presented in executive format.', html: marketHtml, filenameBase: `${product.slug}-market-research` }),
    customer_insights: richDocArtifact({ title: `${product.name} Customer Insights`, category: 'Research', summary: 'Pain points, objections, motivations, and message hooks for the real buyer.', html: buildCustomerHtml(product, brand, strategy), filenameBase: `${product.slug}-customer-insights` }),
    competitor_intel: richDocArtifact({ title: `${product.name} Competitor Intelligence`, category: 'Research', summary: 'Competitive field, gaps, and the positioning angles to exploit.', html: competitorHtml, filenameBase: `${product.slug}-competitor-intelligence` }),
    gtm_strategy: richDocArtifact({ title: `${product.name} GTM Strategy`, category: 'Strategy', summary: 'Positioning, value props, campaign themes, and the demand motion to run.', html: gtmHtml, filenameBase: `${product.slug}-gtm-strategy` }),
    channel_priorities: richDocArtifact({ title: `${product.name} Channel Priorities`, category: 'Strategy', summary: 'Ranked channel stack with commercial reasons for each choice.', html: buildChannelHtml(product, brand, strategy), filenameBase: `${product.slug}-channel-priorities` }),
    campaign_plan: richDocArtifact({ title: `${product.name} 90-Day Campaign Plan`, category: 'Execution', summary: 'Quarter-style campaign roadmap with phases, experiments, and owners.', html: buildCampaignHtml(product, brand, campaignPlan), filenameBase: `${product.slug}-90-day-campaign-plan` }),
    seo_brief: richDocArtifact({ title: `${product.name} SEO Brief`, category: 'Content', summary: 'Commercial-intent keyword brief with outline and conversion framing.', html: buildSeoHtml(product, brand, assets), filenameBase: `${product.slug}-seo-brief` }),
    blog_briefs: richDocArtifact({ title: `${product.name} Blog Briefs`, category: 'Content', summary: 'Two board-grade content briefs aligned to demand capture and trust building.', html: buildBlogHtml(product, brand, assets), filenameBase: `${product.slug}-blog-briefs` }),
    social_posts: richDocArtifact({ title: `${product.name} Social Content Pack`, category: 'Content', summary: 'Formatted posts with hashtags, creative direction, and CTA guidance.', html: socialHtml, filenameBase: `${product.slug}-social-content-pack`, extraDownloads: socialVariantDownloads(product, assets), previewHtml: `<div class="preview-stack"><div class="preview-kicker">Content</div><h3>${escapeHtml(product.name)} Social Content Pack</h3><p>Formatted posts with hashtags, creative direction, CTA guidance, and image variants for testing.</p>${assets.generatedImages.social ? `<img src="${dataUri(assets.generatedImages.social)}" alt="${escapeHtml(product.name)} social creative" style="width:100%;border-radius:18px;border:1px solid rgba(148,163,184,0.18);margin-top:12px" />` : ''}<p>${escapeHtml(`${assets.generatedImages.socialVariants?.length || 0} social image variant(s) ready.`)}</p></div>` }),
    email_sequence: richDocArtifact({ title: `${product.name} Email Sequence`, category: 'Content', summary: 'Three polished lifecycle emails with subject, purpose, and message body.', html: emailHtml, filenameBase: `${product.slug}-email-sequence` }),
    landing_page_copy: richDocArtifact({ title: `${product.name} Landing Page Copy`, category: 'Content', summary: 'Premium landing page copy blocks with proof-first structure.', html: landingHtml, filenameBase: `${product.slug}-landing-page-copy` }),
    cro_recommendations: richDocArtifact({ title: `${product.name} CRO Recommendations`, category: 'Optimization', summary: 'Highest-leverage friction fixes and experiment list in CEO-readable format.', html: buildCroHtml(product, brand, strategy), filenameBase: `${product.slug}-cro-recommendations` }),
    analytics_plan: richDocArtifact({ title: `${product.name} Analytics Plan`, category: 'Measurement', summary: 'North-star metric, scorecard, and reporting rhythm for leadership.', html: analyticsHtml, filenameBase: `${product.slug}-analytics-plan` }),
    social_posting_plan: richDocArtifact({ title: `${product.name} Social Posting Plan`, category: 'Execution', summary: 'Cadence, mix, and operating rhythm for social distribution.', html: buildPostingPlanHtml(product, brand, assets), filenameBase: `${product.slug}-social-posting-plan` }),
    content_backlog: richDocArtifact({ title: `${product.name} Content Backlog`, category: 'Execution', summary: 'Prioritized content backlog in a presentable planning format.', html: backlogHtml, filenameBase: `${product.slug}-content-backlog` }),
    execution_backlog: richDocArtifact({ title: `${product.name} Execution Backlog`, category: 'Execution', summary: 'Owner-by-owner action list for the first operating cycle.', html: buildExecutionHtml(product, brand, assets), filenameBase: `${product.slug}-execution-backlog` }),
    draft_queue: richDocArtifact({ title: `${product.name} Draft Queue`, category: 'Workflow', summary: 'Draft status ledger for approval and publishing control.', html: buildDraftQueueHtml(product, brand, assets), filenameBase: `${product.slug}-draft-queue` }),
    cron_manifest: richDocArtifact({ title: `${product.name} Operating Rhythm`, category: 'Workflow', summary: 'Daily, weekly, and monthly cadence in a clean operator memo.', html: simpleDocHtml(`${product.name} Operating Rhythm`, `<pre>${escapeHtml(assets.cronManifest)}</pre>`, brand), filenameBase: `${product.slug}-operating-rhythm` }),
    content_gen_prompt: textBundleArtifact({ title: `${product.name} Content Generation Prompt`, category: 'Prompting', summary: 'A richer prompt you can drop into another content model.', text: contentPrompt, filenameBase: `${product.slug}-content-generation-prompt` }),
  };

  deliverables.master_board_pack = richDocArtifact({
    title: `${product.name} Master Board Pack`,
    category: 'Flagship report',
    summary: 'One flagship report covering strategy, market, competition, brand, content, and operating cadence.',
    html: buildMasterBoardPackHtml(product, brand, strategy, campaignPlan, assets, deliverables),
    filenameBase: `${product.slug}-master-board-pack`,
  });
  deliverables.full_pack_bundle = zipBundleArtifact(product, deliverables);
  return deliverables;
}

function richDocArtifact({ title, category, summary, html, filenameBase, extraDownloads = [], previewHtml }) {
  return {
    format: 'Word + HTML + PDF-ready',
    category,
    preview: summary,
    previewHtml: previewHtml || `<div class="preview-stack"><div class="preview-kicker">${escapeHtml(category)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(summary)}</p></div>`,
    downloads: [
      { label: 'Download Word', filename: `${filenameBase}.doc`, mimeType: 'application/msword', content: wrapWordHtml(title, html) },
      { label: 'Download HTML', filename: `${filenameBase}.html`, mimeType: 'text/html;charset=utf-8', content: wrapStandaloneHtml(title, html) },
      { label: 'Open / Save PDF', filename: `${filenameBase}.html`, mimeType: 'text/html;charset=utf-8', content: wrapStandaloneHtml(title, html), action: 'print' },
      ...extraDownloads,
    ],
  };
}

function imageDownload(label, filename, image) {
  return {
    label,
    filename,
    mimeType: image.mimeType,
    base64: image.base64,
  };
}

function socialVariantDownloads(product, assets) {
  return (assets.generatedImages.socialVariants || []).map((image, index) => imageDownload(`Download Social Variant ${index + 1}`, `${product.slug}-social-variant-${index + 1}.png`, image));
}

function textBundleArtifact({ title, category, summary, text, filenameBase }) {
  const html = `<h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre>`;
  return {
    format: 'Text + Word + PDF-ready',
    category,
    preview: summary,
    previewHtml: `<div class="preview-stack"><div class="preview-kicker">${escapeHtml(category)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(summary)}</p></div>`,
    downloads: [
      { label: 'Download TXT', filename: `${filenameBase}.txt`, mimeType: 'text/plain;charset=utf-8', content: `${text.trim()}\n` },
      { label: 'Download Word', filename: `${filenameBase}.doc`, mimeType: 'application/msword', content: wrapWordHtml(title, html) },
      { label: 'Open / Save PDF', filename: `${filenameBase}.html`, mimeType: 'text/html;charset=utf-8', content: wrapStandaloneHtml(title, html), action: 'print' },
    ],
  };
}

function logoArtifact(product, brand, assets, logoGuideHtml) {
  return {
    format: 'SVG + AI prompts + Word + PDF-ready',
    category: 'Brand assets',
    preview: `Primary logo, icon mark, AI logo prompts, and a usage guide for ${product.name}.`,
    previewHtml: `<div class="preview-stack"><div class="preview-kicker">Brand assets</div><h3>${escapeHtml(product.name)} logo pack</h3><p>Primary wordmark, icon mark, AI prompt stack, and a clean usage guide in brand colors.</p><div class="logo-preview">${assets.generatedImages.logo ? `<img src="${dataUri(assets.generatedImages.logo)}" alt="${escapeHtml(product.name)} logo concept" style="width:100%;max-width:220px;border-radius:16px;border:1px solid rgba(148,163,184,0.2)" />` : assets.iconSvg}</div></div>`,
    downloads: [
      { label: 'Download Logo SVG', filename: `${product.slug}-logo.svg`, mimeType: 'image/svg+xml', content: assets.logoSvg },
      { label: 'Download Icon SVG', filename: `${product.slug}-icon.svg`, mimeType: 'image/svg+xml', content: assets.iconSvg },
      ...(assets.generatedImages.logo ? [imageDownload('Download Gemini Logo PNG', `${product.slug}-logo-concept.png`, assets.generatedImages.logo)] : []),
      ...(assets.generatedImages.logoVariants || []).map((image, index) => imageDownload(`Download Logo Variant ${index + 1}`, `${product.slug}-logo-variant-${index + 1}.png`, image)),
      ...(assets.generatedImages.moodboard ? [imageDownload('Download Gemini Moodboard PNG', `${product.slug}-brand-moodboard.png`, assets.generatedImages.moodboard)] : []),
      { label: 'Download AI Prompt', filename: `${product.slug}-logo-prompt.txt`, mimeType: 'text/plain;charset=utf-8', content: `${assets.logoPrompt}\n\nMoodboard prompt:\n${assets.moodboardPrompt}\n` },
      { label: 'Download Word Guide', filename: `${product.slug}-logo-guide.doc`, mimeType: 'application/msword', content: wrapWordHtml(`${product.name} Logo Guide`, logoGuideHtml) },
      { label: 'Open / Save PDF', filename: `${product.slug}-logo-guide.html`, mimeType: 'text/html;charset=utf-8', content: wrapStandaloneHtml(`${product.name} Logo Guide`, logoGuideHtml), action: 'print' },
    ],
  };
}

function buildCeoReportHtml(product, brand, strategy, campaignPlan, assets) {
  const topCompetitor = strategy.competitor.competitors[0];
  return composeDoc(`${product.name} CEO Growth Brief`, brand, `Board-ready report for ${product.name}`, `Prepared as a deterministic strategy pack for ${product.audience}.`, [
    metricGrid([
      ['Category', product.category],
      ['Audience', product.audience],
      ['North-star metric', northStarMetric(product.businessModel)],
      ['Primary CTA', primaryCta(product.businessModel)],
    ]),
    section('Executive summary', `<p>${brand.promise}</p><ul>${listItems([
      strategy.positioningStatement,
      `Brand vision: ${brand.vision}`,
      `Best immediate demand motion: ${strategy.gtmMotion}.`,
      `Highest-leverage channel: ${strategy.channelPriorities[0].channel}.`,
      `First strategic experiment: ${strategy.cro.experiments[0].name}.`,
    ])}</ul>`),
    section('Brand positioning and vision', twoCol([
      card('Positioning core', `<p>${escapeHtml(brand.positioningCore)}</p><p><strong>Market position:</strong> ${escapeHtml(strategy.marketPositioning)}</p>`),
      card('Vision + mission', `<p><strong>Vision:</strong> ${escapeHtml(brand.vision)}</p><p><strong>Mission:</strong> ${escapeHtml(brand.mission)}</p>`),
      card('STP framework', `<p><strong>Targeting:</strong> ${escapeHtml(strategy.stp.targeting)}</p><ul>${listItems(strategy.stp.segmentation)}</ul>`),
      card('Reasons to believe', `<ul>${listItems(brand.reasonsToBelieve)}</ul>`),
    ])),
    section('Market landscape', twoCol([
      card('Category read', `<p>${escapeHtml(strategy.market.marketView)}</p>`),
      card('Demand drivers', `<ul>${listItems(strategy.market.demandDrivers || [])}</ul>`),
      card('Whitespace', `<ul>${listItems(strategy.market.whitespace)}</ul>`),
      card('Category risk watchouts', `<ul>${listItems(strategy.market.riskSignals)}</ul>`),
      card('Global / geography lens', `<ul>${listItems(strategy.market.geographyLens || [])}</ul>`),
      card('Strategic implications', `<ul>${listItems(strategy.market.strategicImplications || [])}</ul>`),
    ])),
    section('Competition analysis', `${table(['Competitor', 'Theme', 'Gap', 'Price posture', 'Trust posture'], strategy.competitor.competitors.map((item) => [item.name, item.theme, item.gap, item.pricePosture, item.trustPosture]))}<div style="margin-top:16px">${buildPerceptualMapSvg(product, strategy)}</div>${twoCol([
      card('Archetypes', table(['Archetype', 'Win / lose'], strategy.competitor.archetypes.map((item) => item))),
      card('Blind spots', `<ul>${listItems(strategy.competitor.blindSpots || [])}</ul>`),
      card('Disruptable assumptions', `<ul>${listItems(strategy.competitor.disruptableAssumptions || [])}</ul>`),
      card('Evaluation axes', `<ul>${listItems(strategy.competitor.evaluationAxes || [])}</ul>`),
    ])}`),
    section('Ideal customer profile', twoCol([
      card('Pain points', `<ul>${listItems(strategy.customer.painPoints)}</ul>`),
      card('Objections', `<ul>${listItems(strategy.customer.objections)}</ul>`),
      card('Motivations', `<ul>${listItems(strategy.customer.motivations)}</ul>`),
      card('Jobs to be done', `<ul>${listItems(strategy.customer.jobsToBeDone || [])}</ul>`),
      card('Proof required', `<ul>${listItems(strategy.customer.proofNeeded || [])}</ul>`),
      card('Decision criteria', `<ul>${listItems(strategy.customer.decisionCriteria || [])}</ul>`),
    ])),
    section('Brand system', twoCol([
      card('Tagline', `<p>${escapeHtml(brand.tagline)}</p>`),
      card('Voice pillars', `<ul>${listItems(brand.voicePillars)}</ul>`),
      card('Palette', colorSwatches(brand.colors)),
      card('Logo direction', `${assets.iconSvg}<p style="margin-top:12px"><strong>AI prompt model:</strong> ${escapeHtml(assets.imageProvider.label)}</p>`),
    ])),
    section('Go-to-market strategy', `<p>${escapeHtml(strategy.positioningStatement)}</p>${twoCol([
      card('Campaign themes', `<ul>${listItems(strategy.campaignThemes)}</ul>`),
      card('Strategic opportunities', `<ul>${listItems(strategy.opportunities)}</ul>`),
    ])}`),
    section('90-day operating plan', table(['Phase', 'Focus', 'Outputs'], campaignPlan.phasePlan.map((phase) => [phase.phase, phase.focus, phase.outputs.join(', ')]))),
    section('Social + content highlights', `<div class="grid-3">${assets.socialPosts.map((post) => card(post.channel.toUpperCase(), `<p><strong>${escapeHtml(post.hook)}</strong></p><p>${escapeHtml(post.body)}</p><p><em>${escapeHtml(post.hashtags.join(' '))}</em></p><p><strong>Image prompt:</strong> ${escapeHtml(post.imagePrompt)}</p>`)).join('')}</div>`),
    section('Leadership KPI scorecard', twoCol([
      card('Metrics', `<ul>${listItems(assets.analyticsPlan.scorecard)}</ul>`),
      card('Reporting rhythm', `<p>${escapeHtml(assets.analyticsPlan.reportingRhythm)}</p><p>Monthly CEO memo should compare current trend, target, root cause, and next action.</p>`),
    ])),
    section('Immediate decisions', `<ol>${listItems([
      `Approve the brand system around “${brand.tagline}”.`,
      `Ship the first ${assets.socialPostingPlan.cadence} content sprint focused on proof and pain-point education.`,
      `Run ${strategy.cro.experiments[0].name} before expanding acquisition spend.`,
    ], 'ol')}</ol>`),
  ]);
}

function buildBrandSuiteHtml(product, brand, assets) {
  return composeDoc(`${product.name} Brand Identity Suite`, brand, 'Brand system', 'Logo, voice, color, positioning, and messaging.', [
    section('Brand essence', `<p>${escapeHtml(brand.essence)}</p><p><strong>Promise:</strong> ${escapeHtml(brand.promise)}</p><p><strong>Tagline:</strong> ${escapeHtml(brand.tagline)}</p>`),
    section('Brand vision and positioning', twoCol([
      card('Vision', `<p>${escapeHtml(brand.vision)}</p><p><strong>Mission:</strong> ${escapeHtml(brand.mission)}</p>`),
      card('Positioning', `<p>${escapeHtml(brand.positioningCore)}</p><p><strong>Market position:</strong> ${escapeHtml(brand.marketPositioning)}</p>`),
      card('Reasons to believe', `<ul>${listItems(brand.reasonsToBelieve)}</ul>`),
      card('Tonal sliders', `<ul>${listItems(brand.tonalSliders.map((pair) => `${pair[0]} ↔ ${pair[1]}`), 'html')}</ul>`),
    ])),
    section('Logo system', `<div class="grid-2">${card('Primary mark', assets.logoSvg)}${card('Icon mark', assets.iconSvg)}</div>${assets.generatedImages.logoVariants?.length ? `<div class="grid-3" style="margin-top:14px">${assets.generatedImages.logoVariants.map((image, index) => card(`Logo variant ${index + 1}`, `<img src="${dataUri(image)}" alt="${escapeHtml(product.name)} logo variant ${index + 1}" style="width:100%;border-radius:14px;border:1px solid #dbe3f2" />`)).join('')}</div>` : ''}<div class="doc-card" style="margin-top:14px"><h3>AI image prompts</h3><p><strong>Logo prompt:</strong> ${escapeHtml(assets.logoPrompt)}</p><p><strong>Moodboard prompt:</strong> ${escapeHtml(assets.moodboardPrompt)}</p></div>`),
    section('Color palette', colorSwatches(brand.colors)),
    section('Typography', table(['Layer', 'Spec'], Object.entries(brand.typography).map(([key, value]) => [titleCase(key), value]))),
    section('Voice rules', twoCol([
      card('Do', `<ul>${listItems(brand.voicePillars)}</ul>`),
      card('Avoid', `<ul>${listItems(['empty hype', 'feature dumps without outcomes', 'vague claims without proof'])}</ul>`),
    ])),
    section('Message architecture', `<ul>${listItems(product.messagingPillars)}</ul>`),
  ]);
}

function buildLogoGuideHtml(product, brand, assets) {
  return composeDoc(`${product.name} Logo Guide`, brand, 'Logo pack', 'Primary logo, icon mark, AI prompts, and simple usage rules.', [
    section('Primary logo', assets.logoSvg),
    section('Icon mark', assets.iconSvg),
    section('AI generation prompts', `<p><strong>Recommended provider:</strong> ${escapeHtml(assets.imageProvider.label)}</p><p><strong>Logo prompt:</strong> ${escapeHtml(assets.logoPrompt)}</p><p><strong>Moodboard prompt:</strong> ${escapeHtml(assets.moodboardPrompt)}</p>${assets.generatedImages.logoVariants?.length ? `<p><strong>Variants generated:</strong> ${assets.generatedImages.logoVariants.length} logo concepts + ${assets.generatedImages.socialVariants?.length || 0} social creatives.</p>` : ''}`),
    section('Usage rules', `<ul>${listItems([
      'Use the full logo on dark premium backgrounds or white.',
      'Use the icon mark for social avatars, favicons, and compact placements.',
      'Maintain generous padding equal to the inner mark height.',
      'Do not distort, recolor randomly, or add drop-shadow noise.',
    ])}</ul>`),
  ]);
}

function buildVoiceHtml(product, brand) {
  return composeDoc(`${product.name} Brand Voice`, brand, 'Voice system', 'How the brand should sound in public-facing communication.', [
    section('Core voice pillars', `<ul>${listItems(brand.voicePillars)}</ul>`),
    section('Messaging examples', `<div class="grid-2">${card('Good', `<p>${escapeHtml(brand.tagline)}. Built for ${product.audience} who need commercial clarity, not more software theatre.</p>`)}${card('Bad', '<p>Revolutionary next-gen solution for everyone. Powered by synergy. Completely game-changing. Horrid.</p>')}</div>`),
  ]);
}

function buildIcpHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Ideal Customer Profile`, brand, 'Ideal customer profile', 'Primary buyer and what they care about.', [
    section('Buyer snapshot', metricGrid([
      ['Audience', product.audience],
      ['Problem', product.problem],
      ['Motivation', strategy.customer.motivations[0]],
      ['Biggest objection', strategy.customer.objections[0]],
    ])),
    section('Pain points', `<ul>${listItems(strategy.customer.painPoints)}</ul>`),
    section('Commercial triggers', `<ul>${listItems(['revenue leakage', 'fragmented workflow', 'slow team response', 'lack of visibility into ROI'])}</ul>`),
  ]);
}

function buildMarketHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Market Research`, brand, 'Market research', 'Whitespace, trends, demand-capture opportunities, and market positioning.', [
    section('Category read', `<p>${escapeHtml(strategy.market.marketView)}</p><p><strong>Market position:</strong> ${escapeHtml(strategy.marketPositioning)}</p>`),
    section('Research lens', twoCol([
      card('Method used', `<ul>${listItems(strategy.market.researchMethod || [])}</ul>`),
      card('Demand drivers', `<ul>${listItems(strategy.market.demandDrivers || [])}</ul>`),
      card('Premiumization signals', `<ul>${listItems(strategy.market.premiumizationSignals || [])}</ul>`),
      card('Global / geography lens', `<ul>${listItems(strategy.market.geographyLens || [])}</ul>`),
    ])),
    section('STP framing', twoCol([
      card('Segmentation', `<ul>${listItems(strategy.stp.segmentation)}</ul>`),
      card('Targeting', `<p>${escapeHtml(strategy.stp.targeting)}</p>`),
      card('Positioning', `<p>${escapeHtml(strategy.stp.positioning)}</p>`),
      card('Why now', `<ul>${listItems(strategy.market.trendSummary)}</ul>`),
    ])),
    section('Whitespace', `<ul>${listItems(strategy.market.whitespace)}</ul>`),
    section('Market positioning moves', `<ul>${listItems(strategy.market.positioningMoves)}</ul>`),
    section('Channel opportunities', `<ul>${listItems(strategy.market.channelOpportunities)}</ul>`),
    section('Strategic implications', `<ul>${listItems(strategy.market.strategicImplications || [])}</ul>`),
    section('Risk watchouts', `<ul>${listItems(strategy.market.riskSignals)}</ul>`),
  ]);
}

function buildCompetitorHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Competitor Intelligence`, brand, 'Competitor intelligence', 'Competitive field, weak points, strategic openings, and market positioning map.', [
    section('Competitor grid', table(['Competitor', 'Positioning theme', 'Gap to exploit', 'Price posture', 'Trust posture'], strategy.competitor.competitors.map((item) => [item.name, item.theme, item.gap, item.pricePosture, item.trustPosture]))),
    section('Competitive archetypes', table(['Archetype', 'How they win / lose'], strategy.competitor.archetypes.map((item) => item))),
    section('Perceptual map', buildPerceptualMapSvg(product, strategy)),
    section('Evaluation axes', `<ul>${listItems(strategy.competitor.evaluationAxes || [])}</ul>`),
    section('Differentiation angles', `<ul>${listItems(strategy.competitor.differentiationAngles)}</ul>`),
    section('Disruptable assumptions', `<ul>${listItems(strategy.competitor.disruptableAssumptions || [])}</ul>`),
    section('Competitor blind spots', `<ul>${listItems(strategy.competitor.blindSpots || [])}</ul>`),
    section('Battlecard notes', `<ul>${listItems(strategy.competitor.battlecardNotes)}</ul>`),
  ]);
}

function buildCustomerHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Customer Insights`, brand, 'Customer insights', 'Objections, motivations, and high-conversion messaging hooks.', [
    section('Pain points', `<ul>${listItems(strategy.customer.painPoints)}</ul>`),
    section('Jobs to be done', `<ul>${listItems(strategy.customer.jobsToBeDone || [])}</ul>`),
    section('Objections', `<ul>${listItems(strategy.customer.objections)}</ul>`),
    section('Motivations', `<ul>${listItems(strategy.customer.motivations)}</ul>`),
    section('Purchase triggers', `<ul>${listItems(strategy.customer.purchaseTriggers || [])}</ul>`),
    section('Proof the buyer needs', `<ul>${listItems(strategy.customer.proofNeeded || [])}</ul>`),
    section('Decision criteria', `<ul>${listItems(strategy.customer.decisionCriteria || [])}</ul>`),
  ]);
}

function buildGtmHtml(product, brand, strategy, campaignPlan) {
  return composeDoc(`${product.name} GTM Strategy`, brand, 'Go-to-market strategy', 'Positioning, motion, themes, and commercial sequencing.', [
    section('Positioning statement', `<p>${escapeHtml(strategy.positioningStatement)}</p>`),
    section('Value props', `<ul>${listItems(strategy.valueProps)}</ul>`),
    section('Campaign themes', `<ul>${listItems(strategy.campaignThemes)}</ul>`),
    section('Motion + funnel', `<p><strong>Motion:</strong> ${escapeHtml(strategy.gtmMotion)}</p><ul>${listItems(strategy.funnelSummary)}</ul>`),
    section('Phase plan', table(['Phase', 'Focus'], campaignPlan.phasePlan.map((item) => [item.phase, item.focus]))),
  ]);
}

function buildChannelHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Channel Priorities`, brand, 'Channel priorities', 'Ranked channel stack and the commercial reason for each.', [
    section('Priority stack', table(['Rank', 'Channel', 'Why now'], strategy.channelPriorities.map((item) => [String(item.rank), item.channel, item.whyNow]))),
  ]);
}

function buildCampaignHtml(product, brand, campaignPlan) {
  return composeDoc(`${product.name} 90-Day Campaign Plan`, brand, '90-day campaign plan', 'Quarter-style operating roadmap.', [
    section('Phase plan', table(['Phase', 'Focus', 'Outputs'], campaignPlan.phasePlan.map((item) => [item.phase, item.focus, item.outputs.join(', ')]))),
    section('Experiments', `<ul>${listItems(campaignPlan.experiments)}</ul>`),
    section('Funnel ownership', table(['Stage', 'Goal', 'Owner'], campaignPlan.funnelStages.map((item) => [item.stage, item.goal, item.owner]))),
  ]);
}

function buildSeoHtml(product, brand, assets) {
  return composeDoc(`${product.name} SEO Brief`, brand, 'SEO brief', 'Commercial-intent SEO structure.', [
    section('Keyword map', metricGrid([
      ['Primary keyword', assets.seoBrief.primaryKeyword],
      ['Intent', assets.seoBrief.searchIntent],
    ])),
    section('Secondary keywords', `<ul>${listItems(assets.seoBrief.secondaryKeywords)}</ul>`),
    section('Outline', `<ol>${listItems(assets.seoBrief.outline, 'ol')}</ol>`),
  ]);
}

function buildBlogHtml(product, brand, assets) {
  return composeDoc(`${product.name} Blog Briefs`, brand, 'Blog briefs', 'Two strong briefs for demand capture and commercial trust.', [
    section('Article briefs', `<div class="grid-2">${assets.blogBriefs.map((item) => card(item.title, `<p><strong>Angle:</strong> ${escapeHtml(item.angle)}</p><p><strong>CTA:</strong> ${escapeHtml(item.cta)}</p>`)).join('')}</div>`),
  ]);
}

function buildSocialHtml(product, brand, assets) {
  return composeDoc(`${product.name} Social Content Pack`, brand, 'Social content pack', 'Formatted posts with hashtags, creative direction, and AI image prompts.', [
    section('Posting cadence', `<p>${escapeHtml(assets.socialPostingPlan.cadence)} across ${escapeHtml(assets.socialPostingPlan.channels.join(', '))}.</p><p><strong>Recommended image provider:</strong> ${escapeHtml(assets.imageProvider.label)}</p>`),
    section('Posts', `<div class="grid-3">${assets.socialPosts.map((post) => card(`${titleCase(post.channel)} · ${post.id}`, `<p><strong>${escapeHtml(post.hook)}</strong></p><p>${escapeHtml(post.body)}</p><p><strong>CTA:</strong> ${escapeHtml(post.cta)}</p><p><strong>Hashtags:</strong> ${escapeHtml(post.hashtags.join(' '))}</p><p><strong>Creative:</strong> ${escapeHtml(post.creativeDirection)}</p><p><strong>Image prompt:</strong> ${escapeHtml(post.imagePrompt)}</p>`)).join('')}</div>${assets.generatedImages.socialVariants?.length ? `<div class="grid-3" style="margin-top:14px">${assets.generatedImages.socialVariants.map((image, index) => card(`Social variant ${index + 1}`, `<img src="${dataUri(image)}" alt="${escapeHtml(product.name)} social variant ${index + 1}" style="width:100%;border-radius:14px;border:1px solid #dbe3f2" />`)).join('')}</div>` : ''}`),
  ]);
}

function buildEmailHtml(product, brand, assets) {
  return composeDoc(`${product.name} Email Sequence`, brand, 'Email sequence', 'Lifecycle sequence with a clear purpose per message.', [
    section('Emails', `<div class="stack">${assets.emailSequence.map((item) => card(item.stage, `<p><strong>Subject:</strong> ${escapeHtml(item.subject)}</p><p><strong>Purpose:</strong> ${escapeHtml(item.purpose)}</p><p>${escapeHtml(item.body)}</p>`)).join('')}</div>`),
  ]);
}

function buildLandingHtml(product, brand, assets) {
  return composeDoc(`${product.name} Landing Page Copy`, brand, 'Landing page copy', 'Proof-first landing page framework.', [
    section('Blocks', table(['Section', 'Copy'], assets.landingPage.map((item) => [item.title, item.copy]))),
  ]);
}

function buildCroHtml(product, brand, strategy) {
  return composeDoc(`${product.name} CRO Recommendations`, brand, 'CRO recommendations', 'High-impact conversion improvements.', [
    section('Friction points', `<ul>${listItems(strategy.cro.frictionPoints)}</ul>`),
    section('Experiments', table(['Experiment', 'Impact', 'Effort'], strategy.cro.experiments.map((item) => [item.name, item.impact, item.effort]))),
  ]);
}

function buildAnalyticsHtml(product, brand, assets) {
  return composeDoc(`${product.name} Analytics Plan`, brand, 'Analytics plan', 'Leadership scorecard and reporting rhythm.', [
    section('Scorecard', `<ul>${listItems(assets.analyticsPlan.scorecard)}</ul>`),
    section('North-star metric', `<p>${escapeHtml(assets.analyticsPlan.northStarMetric)}</p>`),
    section('Reporting cadence', `<p>${escapeHtml(assets.analyticsPlan.reportingRhythm)}</p>`),
  ]);
}

function buildPostingPlanHtml(product, brand, assets) {
  return composeDoc(`${product.name} Social Posting Plan`, brand, 'Social posting plan', 'Cadence, mix, and working rhythm.', [
    section('Operating plan', metricGrid([
      ['Cadence', assets.socialPostingPlan.cadence],
      ['Channels', assets.socialPostingPlan.channels.join(', ')],
      ['Mix', assets.socialPostingPlan.mix.join(', ')],
    ])),
  ]);
}

function buildBacklogHtml(product, brand, assets) {
  return composeDoc(`${product.name} Content Backlog`, brand, 'Content backlog', 'Prioritized content workstream.', [
    section('Backlog', table(['Title', 'Status', 'Outputs'], assets.contentBacklog.map((item) => [item.title, item.status, item.outputs.join(', ')]))),
  ]);
}

function buildExecutionHtml(product, brand, assets) {
  return composeDoc(`${product.name} Execution Backlog`, brand, 'Execution backlog', 'Owner-by-owner delivery plan.', [
    section('Execution list', table(['Owner', 'Task', 'Status'], assets.executionBacklog.map((item) => [item.owner, item.task, item.status]))),
  ]);
}

function buildDraftQueueHtml(product, brand, assets) {
  return composeDoc(`${product.name} Draft Queue`, brand, 'Draft queue', 'Approval-aware draft ledger.', [
    section('Drafts', table(['Type', 'ID', 'Status'], assets.draftQueue.items.map((item) => [item.type, item.id, item.status]))),
  ]);
}

function buildContentPrompt(product, brand, strategy, assets) {
  return `Create a premium marketing pack for ${product.name}.\n\nBrand:\n- Tagline: ${brand.tagline}\n- Promise: ${brand.promise}\n- Vision: ${brand.vision}\n- Positioning core: ${brand.positioningCore}\n- Voice: ${brand.voicePillars.join(', ')}\n\nProduct:\n- Category: ${product.category}\n- Audience: ${product.audience}\n- Problem solved: ${product.problem}\n- Messaging pillars: ${product.messagingPillars.join(', ')}\n\nStrategy:\n- STP positioning: ${strategy.stp.positioning}\n- Market position: ${strategy.marketPositioning}\n- GTM motion: ${strategy.gtmMotion}\n- Themes: ${strategy.campaignThemes.join(', ')}\n- Competitor weak spots: ${strategy.competitor.differentiationAngles.join(', ')}\n\nNeed:\n1. Three polished social posts with hashtags and matching image prompts\n2. One hero section rewrite\n3. One sales email\n4. One SEO/blog angle\n5. One proof-first CTA recommendation\n6. One concise competition insight\n\nConstraints:\n- Premium, credible, commercially literate\n- No empty hype\n- Use proof language and clear next actions\n- Make outputs board-safe and founder-usable\n\nReference hashtags: ${assets.hashtags.join(' ')}\nPreferred image workflow: ${assets.imageProvider.label}\nLogo prompt: ${assets.logoPrompt}\n`;
}

function marketResearch(product) {
  if (isFashionProduct(product)) {
    return {
      marketView: `The premium ${product.category} space is globally fragmented between discount-heavy marketplaces, boutique offline trust, and a smaller set of brands that translate craftsmanship into modern desirability.`,
      researchMethod: [
        'Category demand lens: premium ethnic occasionwear, festive fashion, wedding shopping, gifting, and repeat-wear value.',
        'Buyer lens: authenticity, drape confidence, finish, styling guidance, and premium presentation quality.',
        'Commercial lens: higher trust conversion, lower return anxiety, stronger repeat purchase and occasion-led collection launches.',
      ],
      demandDrivers: [
        'Wedding, festive, and gifting occasions create recurring premium purchase windows.',
        'Short-form visual discovery and creator styling content shape early brand preference.',
        'Premium buyers increasingly reward authenticity, weave detail, and styling confidence over raw assortment size.',
      ],
      premiumizationSignals: [
        'Editorial presentation and texture-rich product storytelling outperform generic catalog layouts.',
        'Trust cues around fabric authenticity, finish, and drape reduce hesitation at premium price points.',
        'Curated occasion edits and styling guidance increase conversion quality and average order confidence.',
      ],
      geographyLens: [
        'India is the cultural and demand center, but gifting, diaspora buying, and wedding commerce create global premium demand pockets.',
        'Regional traditions matter: discovery should support bridal, festive, family-event, and heirloom-style narratives.',
        'English-first digital presentation can coexist with culturally rich styling cues without flattening the heritage signal.',
      ],
      channelOpportunities: [
        'Use Instagram and short-form video for drape, texture, and occasion styling discovery.',
        'Capture high-intent search demand with silk saree, bridal, festive, and regional style guides.',
        'Use lifecycle messaging for new launches, occasion edits, and trust-building around fabric authenticity.',
      ],
      whitespace: [
        `Most ${product.category} sellers rely on catalog-style selling and under-invest in craftsmanship storytelling.`,
        'There is room for a trust-first premium narrative built around weave quality, authenticity, drape, and occasion fit.',
        'Few brands combine heritage richness with a polished modern buying experience and clear styling guidance.',
      ],
      positioningMoves: [
        'Frame the offer as premium heritage fashion with modern confidence, not discount-led catalog inventory.',
        'Turn authenticity, weave detail, and styling clarity into visible buying advantages.',
        'Use education around fabric, occasions, and care to make generic alternatives feel risky and forgettable.',
      ],
      riskSignals: [
        'Price-led marketplaces can compress differentiation unless quality signals stay obvious.',
        'Generic festive messaging will blur the brand into commodity sellers.',
        'If trust cues around authenticity and finish are weak, buyers delay purchase.',
      ],
      trendSummary: [
        'Buyers increasingly reward authenticity, styling confidence, and premium presentation over catalog breadth alone.',
        'Short-form social proof and creator-led drape demos drive first-touch trust in fashion discovery.',
        'Occasion-based shopping journeys create demand for curated edits, gifting cues, and confidence-building education.',
      ],
      strategicImplications: [
        'Build the brand around occasion confidence, not just product inventory.',
        'Make every premium claim legible through texture, close-up detail, and styling context.',
        'Treat content as trust infrastructure, not just promotion.',
      ],
    };
  }
  return {
    marketView: `The ${product.category} category is crowded with feature-led incumbents, narrower challengers, and internal workarounds, but buyers still reward clarity, proof, and speed-to-value over feature breadth alone.`,
    researchMethod: [
      'Category lens: demand capture, switching friction, and level of commercial urgency.',
      'Buyer lens: trust, implementation confidence, ROI visibility, and internal adoption risk.',
      'Commercial lens: pipeline quality, conversion speed, expansion potential, and proof density.',
    ],
    demandDrivers: [
      'Economic scrutiny pushes buyers toward commercially legible outcomes rather than novelty.',
      'Search, peer proof, and executive-safe messaging shape shortlist entry.',
      'Operators prefer fewer moving parts, faster onboarding, and visible reporting clarity.',
    ],
    premiumizationSignals: [
      'Outcome-led positioning with proof beats feature dumping.',
      'Implementation confidence and visible reporting can justify price premium.',
      'Board-safe narrative quality matters when purchases require multi-stakeholder approval.',
    ],
    geographyLens: [
      'Global B2B demand increasingly concentrates around categories that reduce drag, improve visibility, or compress time-to-value.',
      'Regional nuance mostly changes compliance, buying tempo, and channel mix rather than the core value logic.',
      'An executive-ready narrative should survive both founder-led sales and formal procurement contexts.',
    ],
    channelOpportunities: [
      `Use ${product.channels.find((channel) => !['seo', 'email'].includes(channel)) || 'linkedin'} for pain-point education and proof distribution.`,
      'Capture high-intent search demand with comparison and implementation content.',
      'Use lifecycle email to convert evaluators into commercially ready buyers.',
    ],
    whitespace: [
      `Most ${product.category} competitors over-explain features and under-explain commercial outcomes.`,
      'There is room for a trust-first narrative built around proof, process clarity, and faster time-to-value.',
      'Few brands connect brand story to operational ROI cleanly enough for executive buyers.',
    ],
    positioningMoves: [
      'Frame the offer as the premium, proof-led option rather than the broadest option.',
      'Turn setup speed and reporting clarity into visible buying advantages.',
      'Use category education to make alternatives feel operationally expensive.',
    ],
    riskSignals: [
      'Feature parity pressure can compress differentiation unless proof stays visible.',
      'Overly broad messaging will weaken trust with high-intent buyers.',
      'If proof assets lag, incumbents reclaim the safety narrative.',
    ],
    trendSummary: [
      'Buyers reward proof and ROI framing over feature breadth alone.',
      'Short-form social proof increasingly drives first-touch trust.',
      'Leadership teams want cleaner attribution between content, conversion, and revenue.',
    ],
    strategicImplications: [
      'Treat proof architecture as part of the product, not a marketing garnish.',
      'Use category education to reframe buyer hesitation as delay cost.',
      'Keep the narrative sharp enough for both user champions and executive approvers.',
    ],
  };
}

function customerInsights(product) {
  const fashion = isFashionProduct(product);
  const generic = {
    b2b_saas: ['Will this integrate with our current workflow?', 'How fast will the team adopt it?', 'How will we measure ROI?'],
    service_business: ['Will this reduce manual work quickly?', 'How difficult is setup?', 'How soon will this improve booked revenue?'],
    ecommerce: fashion
      ? ['Is the silk authentic and premium enough for the price?', 'Will the drape, color, and styling match the occasion?', 'Can I trust the finish, comfort, and presentation from photos alone?']
      : ['Why trust this over alternatives?', 'Will this fit my use case?', 'Is the quality worth the price?'],
  };
  return {
    painPoints: fashion
      ? [product.problem, 'difficulty judging authenticity and texture online', 'fear of buying something that looks generic in important moments']
      : [product.problem, 'fragmented tools and unclear process', 'fear of choosing a solution that fails to show value'],
    objections: generic[product.businessModel] || ['Why switch now?', 'Is this worth the budget?', 'How fast will value show up?'],
    motivations: fashion
      ? ['confidence in craftsmanship and authenticity', 'occasion-ready elegance', 'a premium purchase that feels special from discovery to delivery']
      : ['confidence in the decision', 'faster path to measurable outcomes', 'clearer operational control'],
    jobsToBeDone: fashion
      ? ['Find a saree that signals quality instantly', 'Reduce the risk of an expensive occasionwear mistake', 'Feel styled, culturally grounded, and premium in the moment that matters']
      : ['Reduce operational drag', 'Improve confidence in commercial decisions', 'Adopt a system that shows visible business value quickly'],
    purchaseTriggers: fashion
      ? ['Wedding or festive calendar event', 'Gifting or family occasion with higher emotional stakes', 'Need for a more premium wardrobe anchor than marketplace alternatives']
      : ['Cost of the current workflow becomes obvious', 'Leadership pressure for cleaner reporting', 'A buying moment opens after a failed workaround or stalled growth target'],
    proofNeeded: fashion
      ? ['Close-up fabric and weave detail', 'Real drape and styling confidence', 'Signals of authenticity, finish, and premium presentation']
      : ['Specific before/after proof', 'Clear onboarding path', 'Evidence that ROI can be seen without a long implementation drag'],
    decisionCriteria: fashion
      ? ['Authenticity and craftsmanship', 'Occasion relevance', 'Visual sophistication', 'Confidence in fit, drape, and premium finish']
      : ['Commercial value', 'Implementation confidence', 'Risk reduction', 'Trustworthiness of the vendor story'],
  };
}

function competitorIntel(product) {
  if (isFashionProduct(product)) {
    return {
      competitors: [
        { name: `Premium bridal/festive ${product.category} label`, theme: 'occasion-led elegance', gap: 'limited authenticity storytelling and inconsistent modern presentation', pricePosture: 'premium', trustPosture: 'aspirational but uneven', x: 68, y: 72 },
        { name: `Marketplace-first ${product.category} seller`, theme: 'catalog breadth and discounting', gap: 'commodity feel and weak brand trust', pricePosture: 'low to mid', trustPosture: 'convenient but generic', x: 34, y: 38 },
        { name: `Boutique offline retailer`, theme: 'touch-and-feel trust', gap: 'limited reach and inconsistent digital storytelling', pricePosture: 'mid to premium', trustPosture: 'familiar but local', x: 56, y: 61 },
        { name: product.name, theme: 'premium heritage-led fashion brand', gap: 'n/a', pricePosture: 'premium with craftsmanship logic', trustPosture: 'credible, elegant, and occasion-specific', x: 78, y: 86 },
      ],
      archetypes: [
        ['Marketplace volume sellers', 'Win on assortment and price, lose on distinction and confidence.'],
        ['Boutique offline retailers', 'Win on touch-and-feel trust, lose on scalable digital storytelling.'],
        ['Premium occasion labels', 'Win on aspiration, often leave craftsmanship proof and modern clarity underdeveloped.'],
      ],
      evaluationAxes: ['craftsmanship credibility', 'occasion relevance', 'digital storytelling quality', 'price integrity', 'trust conversion'],
      differentiationAngles: [
        `Craftsmanship-led positioning for ${product.audience}`,
        'Specific authenticity and drape cues instead of generic catalog styling',
        'Premium presentation without feeling inaccessible or costume-like',
      ],
      disruptableAssumptions: [
        'Premium ethnic fashion must either look traditional and dated or modern and culturally thin.',
        'Marketplaces are good enough for premium purchase decisions if pricing is attractive.',
        'Detailed craftsmanship storytelling is optional once product photography is live.',
      ],
      blindSpots: [
        'Many competitors underuse styling guidance as a conversion lever.',
        'Trust signals are often too generic to justify premium pricing online.',
        'The product story rarely links craftsmanship to emotional occasion confidence.',
      ],
      battlecardNotes: [
        'Against marketplace sellers: win on authenticity, finish, and elevated presentation.',
        'Against offline boutiques: win on reach, discovery, and polished digital trust cues.',
        'Against premium labels: win on clearer craftsmanship storytelling and occasion-fit guidance.',
      ],
    };
  }
  return {
    competitors: [
      { name: `Incumbent ${product.category} platform`, theme: 'breadth and familiarity', gap: 'generic messaging and slow time-to-value story', pricePosture: 'high / bundled', trustPosture: 'safe but stale', x: 32, y: 78 },
      { name: `Niche ${product.category} challenger`, theme: 'single-feature specialization', gap: 'thin proof and weak commercial narrative', pricePosture: 'mid', trustPosture: 'interesting but narrow', x: 58, y: 48 },
      { name: `Do-it-yourself internal workaround`, theme: 'no new spend', gap: 'high manual overhead and low scalability', pricePosture: 'low apparent cost', trustPosture: 'familiar but fragile', x: 22, y: 26 },
      { name: product.name, theme: 'premium proof-led operator system', gap: 'n/a', pricePosture: 'premium with ROI logic', trustPosture: 'modern and credible', x: 74, y: 84 },
    ],
    archetypes: [
      ['Broad incumbents', 'Win on familiarity, lose on narrative sharpness and agility.'],
      ['Niche challengers', 'Win on simplicity, lose on executive trust and completeness.'],
      ['Internal workarounds', 'Win on budget optics, lose on scale, consistency, and visibility.'],
    ],
    evaluationAxes: ['time-to-value', 'proof density', 'implementation confidence', 'executive trust', 'operating simplicity'],
    differentiationAngles: [
      `Outcome-led positioning for ${product.audience}`,
      'Specific proof instead of vague feature lists',
      'Premium feel without enterprise bloat',
    ],
    disruptableAssumptions: [
      'The safest option is the broadest platform.',
      'Feature breadth automatically signals strategic fit.',
      'Reporting can be bolted on later without hurting conversion.',
    ],
    blindSpots: [
      'Many competitors underinvest in proof architecture and objection handling.',
      'Implementation confidence is often implied rather than made explicit.',
      'Executive-safe messaging is weaker than product-detail messaging in most categories.',
    ],
    battlecardNotes: [
      'Against incumbents: win on speed-to-value and clearer commercial story.',
      'Against niche challengers: win on strategic completeness and executive trust.',
      'Against DIY: win on consistency, reporting, and reduced team drag.',
    ],
  };
}

function croInsights() {
  return {
    frictionPoints: ['unclear value proposition above the fold', 'proof appears too late', 'CTA does not match buyer intent stage'],
    experiments: [
      { name: 'proof-first hero', impact: 'high', effort: 'medium' },
      { name: 'intent-matched CTA path', impact: 'high', effort: 'medium' },
      { name: 'objection FAQ block', impact: 'medium', effort: 'low' },
    ],
  };
}

function detectImageProvider(env = {}) {
  if (env.GEMINI_API_KEY) return { key: 'gemini', label: 'Gemini 3.1 Flash Image', ready: true };
  if (env.OPENAI_API_KEY) return { key: 'openai', label: 'OpenAI image generation', ready: true };
  return { key: 'prompt-only', label: 'Nano/Banana/OpenAI/Gemini-ready prompt pack', ready: false };
}

async function generateVisualAssets({ product, logoPrompt, moodboardPrompt, socialCreativePrompt, logoVariantPrompts = [], socialVariantPrompts = [], env, imageProvider }) {
  if (!env.GEMINI_API_KEY) {
    return { logo: null, moodboard: null, social: null, logoVariants: [], socialVariants: [], provider: imageProvider.key };
  }

  const [moodboard, ...variantResults] = await Promise.allSettled([
    generateGeminiImage(env.GEMINI_API_KEY, moodboardPrompt),
    ...logoVariantPrompts.map((prompt) => generateGeminiImage(env.GEMINI_API_KEY, prompt)),
    ...socialVariantPrompts.map((prompt) => generateGeminiImage(env.GEMINI_API_KEY, prompt)),
  ]);

  const logoVariants = variantResults.slice(0, logoVariantPrompts.length).filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const socialVariants = variantResults.slice(logoVariantPrompts.length).filter((item) => item.status === 'fulfilled').map((item) => item.value);

  return {
    logo: logoVariants[0] || null,
    moodboard: moodboard.status === 'fulfilled' ? moodboard.value : null,
    social: socialVariants[0] || null,
    logoVariants,
    socialVariants,
    provider: 'gemini',
    product: product.slug,
  };
}

async function generateGeminiImage(apiKey, prompt) {
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

function dataUri(image) {
  return `data:${image.mimeType};base64,${image.base64}`;
}

function buildMasterBoardPackHtml(product, brand, strategy, campaignPlan, assets, deliverables) {
  const included = Object.entries(deliverables)
    .filter(([id]) => id !== 'full_pack_bundle')
    .map(([id, artifact]) => [titleCase(id), artifact.category, artifact.preview]);
  return composeDoc(`${product.name} Master Board Pack`, brand, 'Flagship board pack', 'One executive-ready report covering brand, market, competition, content, creative variants, and operating rhythm.', [
    section('Board overview', metricGrid([
      ['Deliverables included', String(included.length)],
      ['Logo variants', String(assets.generatedImages.logoVariants?.length || 0)],
      ['Social variants', String(assets.generatedImages.socialVariants?.length || 0)],
      ['Primary CTA', primaryCta(product.businessModel)],
    ])),
    section('Executive summary', `<p>${escapeHtml(brand.promise)}</p><ul>${listItems([
      strategy.positioningStatement,
      `Market position: ${strategy.marketPositioning}`,
      `Lead motion: ${strategy.gtmMotion}`,
      `Board pack format: flagship report + ZIP bundle + creative variants`,
    ])}</ul>`),
    section('Pack contents', table(['Section', 'Category', 'What it covers'], included)),
    section('Brand direction', twoCol([
      card('Vision + positioning', `<p><strong>Vision:</strong> ${escapeHtml(brand.vision)}</p><p><strong>Positioning:</strong> ${escapeHtml(brand.positioningCore)}</p><p><strong>Market position:</strong> ${escapeHtml(brand.marketPositioning)}</p>`),
      card('Voice + proof', `<ul>${listItems([...brand.voicePillars, ...brand.reasonsToBelieve])}</ul>`),
    ])),
    section('Creative system', `${assets.generatedImages.logoVariants?.length ? `<div class="grid-3">${assets.generatedImages.logoVariants.map((image, index) => card(`Logo variant ${index + 1}`, `<img src="${dataUri(image)}" alt="${escapeHtml(product.name)} logo variant ${index + 1}" style="width:100%;border-radius:14px;border:1px solid #dbe3f2" />`)).join('')}</div>` : ''}${assets.generatedImages.socialVariants?.length ? `<div class="grid-3" style="margin-top:14px">${assets.generatedImages.socialVariants.map((image, index) => card(`Social variant ${index + 1}`, `<img src="${dataUri(image)}" alt="${escapeHtml(product.name)} social variant ${index + 1}" style="width:100%;border-radius:14px;border:1px solid #dbe3f2" />`)).join('')}</div>` : ''}`),
    section('Market + competitor read', twoCol([
      card('Whitespace', `<ul>${listItems(strategy.market.whitespace)}</ul>`),
      card('Risk watchouts', `<ul>${listItems(strategy.market.riskSignals)}</ul>`),
      card('Differentiation angles', `<ul>${listItems(strategy.competitor.differentiationAngles)}</ul>`),
      card('Battlecard notes', `<ul>${listItems(strategy.competitor.battlecardNotes)}</ul>`),
    ])),
    section('Perceptual map', buildPerceptualMapSvg(product, strategy)),
    section('Demand + content plan', `<div class="grid-3">${assets.socialPosts.map((post) => card(post.channel.toUpperCase(), `<p><strong>${escapeHtml(post.hook)}</strong></p><p>${escapeHtml(post.body)}</p><p><strong>CTA:</strong> ${escapeHtml(post.cta)}</p><p><strong>Creative:</strong> ${escapeHtml(post.creativeDirection)}</p>`)).join('')}</div>`),
    section('90-day execution', table(['Phase', 'Focus', 'Outputs'], campaignPlan.phasePlan.map((phase) => [phase.phase, phase.focus, phase.outputs.join(', ')]))),
    section('Operating cadence', twoCol([
      card('Scorecard', `<ul>${listItems(assets.analyticsPlan.scorecard)}</ul>`),
      card('Rhythm', `<p>${escapeHtml(assets.analyticsPlan.reportingRhythm)}</p><pre>${escapeHtml(assets.cronManifest)}</pre>`),
    ])),
  ]);
}

function zipBundleArtifact(product, deliverables) {
  const files = [];
  for (const [id, artifact] of Object.entries(deliverables)) {
    if (id === 'full_pack_bundle') continue;
    for (const download of selectBundleDownloads(id, artifact.downloads)) {
      files.push({ filename: `${product.slug}/${id}/${download.filename}`, bytes: downloadToBytes(download) });
    }
  }
  const manifest = [
    `${product.name} full pack bundle`,
    '',
    ...Object.entries(deliverables).filter(([id]) => id !== 'full_pack_bundle').map(([id, artifact]) => `- ${id}: ${artifact.preview}`),
  ].join('\n');
  files.unshift({ filename: `${product.slug}/README.txt`, bytes: TEXT_ENCODER.encode(manifest) });
  return {
    format: 'ZIP bundle',
    category: 'Bundle',
    preview: 'One-click ZIP export of the entire pack, including board report, docs, prompts, SVGs, and generated image variants.',
    previewHtml: `<div class="preview-stack"><div class="preview-kicker">Bundle</div><h3>${escapeHtml(product.name)} full pack ZIP</h3><p>One-click export containing the master board pack, every deliverable, and all generated image variants.</p></div>`,
    downloads: [{ label: 'Download Full ZIP Bundle', filename: `${product.slug}-full-pack.zip`, mimeType: 'application/zip', base64: createZipBase64(files) }],
  };
}

function selectBundleDownloads(id, downloads) {
  if (id === 'logo_pack') {
    return downloads.filter((download) =>
      download.filename.endsWith('.svg')
      || download.filename.endsWith('.png')
      || download.filename.endsWith('.txt')
      || download.filename.endsWith('-logo-guide.doc'));
  }
  if (id === 'social_posts') {
    return downloads.filter((download) =>
      download.filename.endsWith('.doc')
      || download.filename.endsWith('.png'));
  }
  if (id === 'content_gen_prompt') {
    return downloads.filter((download) => download.filename.endsWith('.txt'));
  }
  return downloads.filter((download) => download.filename.endsWith('.doc') || download.filename.endsWith('.txt'));
}

function downloadToBytes(download) {
  if (download.base64) return base64ToBytes(download.base64);
  return TEXT_ENCODER.encode(download.content || '');
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function createZipBase64(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = TEXT_ENCODER.encode(file.filename);
    const data = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    let p = 0;
    writeU32(local, p, 0x04034b50); p += 4;
    writeU16(local, p, 20); p += 2;
    writeU16(local, p, 0); p += 2;
    writeU16(local, p, 0); p += 2;
    writeU16(local, p, 0); p += 2;
    writeU16(local, p, 0); p += 2;
    writeU32(local, p, crc); p += 4;
    writeU32(local, p, data.length); p += 4;
    writeU32(local, p, data.length); p += 4;
    writeU16(local, p, nameBytes.length); p += 2;
    writeU16(local, p, 0); p += 2;
    local.set(nameBytes, p); p += nameBytes.length;
    local.set(data, p);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    p = 0;
    writeU32(central, p, 0x02014b50); p += 4;
    writeU16(central, p, 20); p += 2;
    writeU16(central, p, 20); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU32(central, p, crc); p += 4;
    writeU32(central, p, data.length); p += 4;
    writeU32(central, p, data.length); p += 4;
    writeU16(central, p, nameBytes.length); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU16(central, p, 0); p += 2;
    writeU32(central, p, 0); p += 4;
    writeU32(central, p, offset); p += 4;
    central.set(nameBytes, p);
    centralParts.push(central);
    offset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  let p = 0;
  writeU32(end, p, 0x06054b50); p += 4;
  writeU16(end, p, 0); p += 2;
  writeU16(end, p, 0); p += 2;
  writeU16(end, p, files.length); p += 2;
  writeU16(end, p, files.length); p += 2;
  writeU32(end, p, centralSize); p += 4;
  writeU32(end, p, offset); p += 4;
  writeU16(end, p, 0);
  const total = offset + centralSize + end.length;
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const part of localParts) { zip.set(part, cursor); cursor += part.length; }
  for (const part of centralParts) { zip.set(part, cursor); cursor += part.length; }
  zip.set(end, cursor);
  return arrayBufferToBase64(zip);
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function buildPerceptualMapSvg(product, strategy) {
  const points = strategy.competitor.competitors.map((item) => {
    const x = 80 + item.x * 4.4;
    const y = 380 - item.y * 3.1;
    const color = item.name === product.name ? '#79A7FF' : '#94A3B8';
    return `<g><circle cx="${x}" cy="${y}" r="${item.name === product.name ? 10 : 8}" fill="${color}" /><text x="${x + 14}" y="${y - 10}" fill="#E2E8F0" font-size="13" font-family="Inter, Arial, sans-serif">${escapeHtml(item.name)}</text></g>`;
  }).join('');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" width="100%" height="320" fill="none">
      <rect width="560" height="420" rx="24" fill="#0F172A"/>
      <path d="M80 40V380H520" stroke="#334155" stroke-width="2"/>
      <text x="280" y="404" text-anchor="middle" fill="#CBD5E1" font-size="13" font-family="Inter, Arial, sans-serif">Proof / strategic depth →</text>
      <text x="24" y="220" transform="rotate(-90 24 220)" text-anchor="middle" fill="#CBD5E1" font-size="13" font-family="Inter, Arial, sans-serif">↑ Premium / trust posture</text>
      <text x="84" y="62" fill="#64748B" font-size="12" font-family="Inter, Arial, sans-serif">High trust</text>
      <text x="468" y="372" fill="#64748B" font-size="12" font-family="Inter, Arial, sans-serif">High proof</text>
      ${points}
    </svg>
  `;
}

function inferCategory(brief) {
  const text = brief.toLowerCase();
  if (['silk', 'saree', 'lehenga', 'kurta', 'fashion', 'apparel', 'ethnic wear', 'textile', 'boutique', 'jewelry'].some((word) => text.includes(word))) return 'fashion brand';
  if (['software', 'saas', 'crm', 'platform', 'automation'].some((word) => text.includes(word))) return 'software';
  if (['clinic', 'health', 'patient', 'doctor'].some((word) => text.includes(word))) return 'healthcare service';
  if (['course', 'education', 'school', 'student'].some((word) => text.includes(word))) return 'education';
  if (['ecommerce', 'shop', 'store', 'consumer brand'].some((word) => text.includes(word))) return 'consumer brand';
  return 'digital product';
}

function inferProblem(brief) {
  const cleaned = brief.trim().replace(/[.]+$/, '');
  if (!cleaned) return 'an urgent customer problem';
  const lower = cleaned.toLowerCase();
  const seeking = cleaned.match(/seeking\s+(.+)$/i);
  if (seeking) return seeking[1].trim().replace(/[.]+$/, '');
  const need = cleaned.match(/(?:need|needs)\s+(.+)$/i);
  if (need) return need[1].trim().replace(/[.]+$/, '');
  for (const marker of [' to ', ' helps ', ' that ']) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) return cleaned.slice(idx + marker.length).trim().replace(/[.]+$/, '');
  }
  return cleaned;
}

function inferAudience(brief) {
  const text = brief.toLowerCase();
  if (['saree', 'fashion buyers', 'bridal', 'wedding', 'festive', 'occasionwear', 'ethnic wear'].some((word) => text.includes(word))) return 'fashion-conscious women shopping for weddings, festivals, and special occasions';
  if (text.includes('clinic')) return 'clinic owners and practice managers';
  if (['b2b', 'team', 'sales', 'ops'].some((word) => text.includes(word))) return 'operators and decision-makers';
  if (['student', 'parent', 'teacher'].some((word) => text.includes(word))) return 'students and parents';
  if (['consumer', 'shopper', 'creator'].some((word) => text.includes(word))) return 'end customers';
  return 'buyers with a clear pain point';
}

function inferBusinessModel(brief, category) {
  const text = brief.toLowerCase();
  if (['subscription', 'saas', 'software', 'platform', 'crm'].some((word) => text.includes(word))) return 'b2b_saas';
  if (['course', 'coaching', 'cohort'].some((word) => text.includes(word))) return 'education';
  if (['clinic', 'agency', 'service'].some((word) => text.includes(word))) return 'service_business';
  if (category.includes('brand') || ['ecommerce', 'shop', 'store', 'retail', 'boutique', 'fashion', 'saree', 'apparel'].some((word) => text.includes(word))) return 'ecommerce';
  return 'generic';
}

function inferChannels(brief, businessModel) {
  const text = brief.toLowerCase();
  const channels = [];
  if (['search', 'seo', 'traffic', 'organic'].some((word) => text.includes(word))) channels.push('seo');
  if (businessModel === 'b2b_saas' || businessModel === 'service_business') channels.push('linkedin', 'email');
  if (businessModel === 'ecommerce') channels.push('instagram', 'email');
  if (businessModel === 'education') channels.push('youtube', 'email');
  channels.push('seo', 'email', 'social');
  return [...new Set(channels)].slice(0, 5);
}

function inferDifferentiators(brief, category) {
  const text = brief.toLowerCase();
  const candidates = [];
  if (['craftsmanship', 'handwoven', 'handmade', 'woven', 'weave'].some((word) => text.includes(word))) candidates.push('visible craftsmanship and textile depth');
  if (['heritage', 'traditional', 'authentic', 'artisan'].some((word) => text.includes(word))) candidates.push('authentic heritage credibility');
  if (['premium', 'luxury', 'elegant', 'timeless'].some((word) => text.includes(word))) candidates.push('premium occasion-ready styling');
  if (['automation', 'ai', 'workflow'].some((word) => text.includes(word))) candidates.push('automation-driven workflow');
  if (['analytics', 'data', 'reporting'].some((word) => text.includes(word))) candidates.push('visible ROI and reporting');
  if (['simple', 'easy', 'reduce', 'save time'].some((word) => text.includes(word))) candidates.push('fast time-to-value');
  candidates.push(`clear positioning in ${category}`);
  return [...new Set(candidates)].slice(0, 3);
}

function buildPalette(product) {
  const seeds = ['#79A7FF', '#31D5B3', '#A78BFA', '#0F172A', '#F8FAFC'];
  if (product.businessModel === 'ecommerce') return [
    { name: 'Midnight', hex: '#0E172C', use: 'base UI and dark surfaces' },
    { name: 'Rose Signal', hex: '#FB7185', use: 'highlight and CTA accent' },
    { name: 'Warm Gold', hex: '#FBBF24', use: 'premium emphasis' },
    { name: 'Mist', hex: '#EEF2FF', use: 'light backgrounds and cards' },
  ];
  return [
    { name: 'Midnight', hex: seeds[3], use: 'base UI and dark surfaces' },
    { name: 'Signal Blue', hex: seeds[0], use: 'primary accent and trust anchor' },
    { name: 'Verdant', hex: seeds[1], use: 'success and performance callouts' },
    { name: 'Orchid', hex: seeds[2], use: 'secondary accent and premium detail' },
    { name: 'Cloud', hex: seeds[4], use: 'light backgrounds and document space' },
  ];
}

function buildTagline(product) {
  if (isFashionProduct(product)) return `Woven for occasion, styled for memory.`;
  if (product.businessModel === 'b2b_saas') return `From friction to booked growth.`;
  if (product.businessModel === 'service_business') return `Operate cleaner. Convert faster.`;
  if (product.businessModel === 'ecommerce') return `Demand that feels premium and converts.`;
  return `Clarity, proof, and growth in one system.`;
}

function inferArchetype(product) {
  if (isFashionProduct(product)) return 'The Tastemaker';
  if (product.businessModel === 'b2b_saas') return 'The Strategist';
  if (product.businessModel === 'service_business') return 'The Operator';
  if (product.businessModel === 'ecommerce') return 'The Tastemaker';
  return 'The Guide';
}

function buildHashtags(product) {
  const tags = isFashionProduct(product)
    ? ['#SilkSaree', '#EthnicWear', '#WeddingStyle', '#FestiveFashion', '#HeritageLuxury', '#IndianFashion']
    : ['#MarketingStrategy', '#BrandSystem', '#GrowthOS'];
  if (product.businessModel === 'b2b_saas') tags.unshift('#B2BSaaS', '#DemandGen');
  if (product.businessModel === 'service_business') tags.unshift('#LeadGeneration', '#Operations');
  if (product.businessModel === 'ecommerce' && !isFashionProduct(product)) tags.unshift('#EcommerceBrand', '#PerformanceCreative');
  if (product.category.includes('health')) tags.unshift('#HealthTech', '#ClinicGrowth');
  return [...new Set(tags)].slice(0, 6);
}

function isFashionProduct(product) {
  return product.category.includes('fashion') || /silk|saree|lehenga|kurta|apparel|boutique|ethnic/i.test(product.briefDescription || '');
}

function buildLogoSvg(product, brand) {
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

function buildIconSvg(product, brand) {
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

function composeDoc(title, brand, eyebrow, subtitle, sections) {
  return `
    <div class="doc-shell">
      <div class="doc-hero">
        <div>
          <div class="eyebrow">${escapeHtml(eyebrow)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
          <p class="tagline">${escapeHtml(brand.tagline)}</p>
        </div>
        <div class="palette-card">${colorSwatches(brand.colors)}</div>
      </div>
      ${sections.join('')}
    </div>
  `;
}

function section(title, body) {
  return `<section class="doc-section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function card(title, body) {
  return `<article class="doc-card"><h3>${escapeHtml(title)}</h3>${body}</article>`;
}

function twoCol(items) {
  return `<div class="grid-2">${items.join('')}</div>`;
}

function metricGrid(items) {
  return `<div class="metric-grid">${items.map(([label, value]) => `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`).join('')}</div>`;
}

function colorSwatches(colors) {
  return `<div class="swatches">${colors.map((color) => `<div class="swatch"><span class="chip" style="background:${color.hex}"></span><strong>${escapeHtml(color.name)}</strong><small>${escapeHtml(color.hex)} · ${escapeHtml(color.use)}</small></div>`).join('')}</div>`;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function simpleDocHtml(title, body, brand) {
  return composeDoc(title, brand, 'Document', 'Clean export-ready memo.', [section(title, body)]);
}

function wrapWordHtml(title, body) {
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${docStyles()}</head><body>${body}</body></html>`;
}

function wrapStandaloneHtml(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>${docStyles()}</head><body>${body}</body></html>`;
}

function docStyles() {
  return `<style>
    :root { --bg:#f5f8ff; --ink:#0f172a; --muted:#475569; --panel:#ffffff; --line:#dbe3f2; --accent:#79A7FF; --accent2:#31D5B3; }
    *{box-sizing:border-box} body{margin:0;padding:32px;background:var(--bg);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.6} .doc-shell{max-width:1080px;margin:0 auto} .doc-hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;padding:28px;border-radius:24px;background:linear-gradient(135deg,#0f172a,#16213e);color:#fff;margin-bottom:24px} .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#bfdbfe;margin-bottom:10px}.subtitle{color:#cbd5e1}.tagline{color:#86efac;font-weight:700}.palette-card{background:rgba(255,255,255,.08);padding:18px;border-radius:18px;border:1px solid rgba(255,255,255,.14)} .doc-section{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:22px;margin:0 0 18px;break-inside:avoid} h1,h2,h3{margin:0 0 12px} h1{font-size:38px;line-height:1.05} h2{font-size:24px} h3{font-size:17px} p{margin:0 0 12px} ul,ol{margin:0 0 0 18px;padding:0} table{width:100%;border-collapse:collapse;font-size:14px} th,td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left} th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b} .grid-2,.grid-3,.metric-grid,.swatches,.stack{display:grid;gap:14px}.grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.doc-card{border:1px solid var(--line);border-radius:18px;padding:16px;background:#fbfdff}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric{padding:16px;border:1px solid var(--line);border-radius:18px;background:#fbfdff}.metric-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.metric-value{font-size:18px;font-weight:700;margin-top:6px}.swatch{display:grid;gap:6px;padding:12px;border:1px solid var(--line);border-radius:16px;background:#fff}.chip{display:block;width:100%;height:38px;border-radius:12px}.logo-preview svg{max-width:90px;height:auto} pre{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;padding:16px;border-radius:16px;overflow:auto}@media print{body{background:#fff;padding:0}.doc-section{break-inside:avoid-page}.doc-hero{break-inside:avoid-page}} @media (max-width:860px){.doc-hero,.grid-2,.grid-3,.metric-grid{grid-template-columns:1fr}}
  </style>`;
}

function htmlList(items) {
  return `<ul>${listItems(items.map(([label, value]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`), 'html')}</ul>`;
}

function listItems(items, mode = 'ul') {
  if (mode === 'html') return items.map((item) => `<li>${item}</li>`).join('');
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function gtmMotion(businessModel) {
  if (businessModel === 'b2b_saas') return 'demand capture + lead nurture + sales-assisted close';
  if (businessModel === 'ecommerce') return 'traffic + conversion + retention loop';
  if (businessModel === 'education') return 'authority content + trust build + enrollment conversion';
  return 'educate + capture + convert';
}

function northStarMetric(businessModel) {
  if (businessModel === 'b2b_saas') return 'qualified pipeline created';
  if (businessModel === 'ecommerce') return 'revenue per visitor';
  if (businessModel === 'education') return 'enrollments';
  return 'qualified conversions';
}

function primaryCta(businessModel) {
  if (businessModel === 'b2b_saas') return 'Book a demo or request an audit';
  if (businessModel === 'ecommerce') return 'Start with the hero offer or bundle';
  return 'Take the next qualifying action';
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || String(name).slice(0, 2).toUpperCase();
}

function titleCase(value) {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function arrayBufferToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
