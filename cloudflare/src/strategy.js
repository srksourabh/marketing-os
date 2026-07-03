import { initials, slugify } from './utils.js';

export function inferProduct(name, description) {
  const brief = description.trim();
  const category = inferCategory(brief);
  const problem = inferProblem(name, brief, category);
  const audience = inferAudience(name, brief, category);
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


export function buildBrandSystem(product) {
  const palette = buildPalette(product);
  const archetype = inferArchetype(product);
  const tagline = buildTagline(product);
  const fashion = isFashionProduct(product);
  const problem = problemStatement(product.problem);
  const problemNeed = problemNeedStatement(product.problem);
  const positioningCore = fashion
    ? `${product.name} is the premium ${product.category} label for ${product.audience}, bringing ${problem} together with craftsmanship, cultural richness, and elevated styling confidence.`
    : `${product.name} is the premium ${product.category} brand for ${product.audience} who want ${problemNeed} with proof, speed, and operational confidence.`;
  const brandVoice = fashion
    ? [
      'elegant without sounding distant',
      'rooted in craftsmanship and cultural credibility',
      `speaks directly to ${product.audience}`,
      'specific, premium, and visually evocative',
    ]
    : [
      'clear enough for an executive review',
      'confident without sounding performative',
      `written for ${product.audience}`,
      'specific, backed by proof, and tied to buyer decisions',
    ];
  return {
    archetype,
    tagline,
    promise: fashion
      ? `${product.name} helps ${product.audience} find ${problem} with greater confidence in quality, beauty, and occasion-fit.`
      : `${product.name} helps ${product.audience} get ${problemNeed} faster, with fewer handoffs and less waste.`,
    essence: fashion
      ? `${product.category} built on authenticity, elegance, and occasion-ready confidence.`
      : `${product.category} growth system built for credibility and measurable outcomes.`,
    vision: fashion
      ? `Become the most trusted ${product.category} for ${product.audience}, known for authentic craftsmanship, refined styling, and heirloom-worthy appeal.`
      : `Become the most trusted ${product.category} growth platform for ${product.audience}, known for delivering ${problemNeed} as an operating advantage.`,
    mission: fashion
      ? `Help ${product.audience} discover beautifully crafted pieces that feel timeless, premium, and deeply wearable.`
      : `Help ${product.audience} move faster, make better calls, and stop leaking momentum in the middle of execution.`,
    positioningCore,
    marketPositioning: fashion
      ? 'premium heritage-led fashion label with modern presentation, stronger trust cues, and more occasion-specific desirability than generic marketplace sellers'
      : 'focused premium player with sharper proof, tighter execution, and a better fit for lean teams than broad suites',
    reasonsToBelieve: fashion
      ? ['authentic craftsmanship and textile quality', 'distinctive styling rooted in heritage', 'premium presentation that fits gifting and occasion buying']
      : ['proof a buyer can verify quickly', 'faster time to value than heavyweight suites', 'workflow design that lean teams can actually run'],
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

export function buildStrategy(product, brand) {
  const socialChannel = product.channels.find((channel) => !['seo', 'email'].includes(channel)) || 'linkedin';
  const customer = customerInsights(product);
  const competitor = competitorIntel(product);
  const market = marketResearch(product);
  const cro = croInsights();
  const problem = problemStatement(product.problem);
  const problemNeed = problemNeedStatement(product.problem);
  const stp = {
    segmentation: [
      `${product.audience} with acute pain around ${problem}`,
      `mid-market buyers prioritizing proof, speed, and ROI visibility`,
      `teams replacing fragmented manual workflows`,
    ],
    targeting: `Prioritize ${product.audience} already paying the price for missing ${problemNeed} and able to justify the buy on hard ROI.`,
    positioning: brand.positioningCore,
  };
  return {
    positioningStatement: `${product.name} is the ${product.category} choice for ${product.audience} that want ${problemNeed} without adding more process overhead.`,
    marketPositioning: `${product.name} should sit above generic tools and below heavyweight suites: easier to buy, faster to deploy, and easier to trust.`,
    valueProps: product.messagingPillars,
    campaignThemes: ['pain in plain English', 'proof buyers can verify', 'a next step that feels easy to take'],
    opportunities: [
      `Own the trust conversation in ${product.category}.`,
      market.channelOpportunities[0],
      `Directly neutralize the objection: ${customer.objections[0]}`,
      competitor.differentiationAngles[0],
      `Run CRO experiment: ${cro.experiments[0].name}`,
    ],
    gtmMotion: gtmMotion(product.businessModel),
    funnelSummary: [
      'Acquire through high-intent search and opinionated authority content',
      'Capture with proof, sharp positioning, and one clear CTA',
      'Convert with objection handling, demos, and disciplined follow-up',
      'Retain through reporting, adoption prompts, and expansion stories buyers can repeat internally',
    ],
    channelPriorities: product.channels.slice(0, 4).map((channel, index) => ({
      rank: index + 1,
      channel,
      whyNow: {
        seo: 'compounds demand capture and commercial-intent discovery',
        email: 'turns captured attention into pipeline and retention',
        linkedin: 'best channel for proof, founder perspective, and buyer trust',
        instagram: 'best for branded proof, visual framing, and short-form reach',
        youtube: 'best for authority and deeper buyer education',
        social: 'keeps the brand visible and gives proof more places to travel',
      }[channel] || 'supports awareness and deal movement when paired with real proof',
    })),
    stp,
    market,
    customer,
    competitor,
    cro,
    brand,
  };
}

export function buildCampaignPlan(product, objective) {
  return {
    objective,
    calendarWeeks: 12,
    phasePlan: [
      { phase: 'Weeks 1-2', focus: 'Lock positioning, core assets, and proof architecture', outputs: ['brand story', 'landing page hero', 'logo + palette'] },
      { phase: 'Weeks 3-6', focus: 'Capture demand and distribute proof', outputs: ['social series', 'SEO pieces', 'email sequence'] },
      { phase: 'Weeks 7-9', focus: 'Lift conversion and tighten the funnel', outputs: ['CRO tests', 'offer framing', 'objection assets'] },
      { phase: 'Weeks 10-12', focus: 'Review performance and decide what to scale', outputs: ['board update', 'channel scorecard', 'next-quarter bets'] },
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

export function marketResearch(product) {
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
      'Frame the offer as the sharpest choice, not the broadest one.',
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

export function customerInsights(product) {
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
      : ['Cut process drag', 'Make commercial decisions with more confidence', 'Adopt a system that shows business value quickly'],
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

export function competitorIntel(product) {
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

export function croInsights() {
  return {
    frictionPoints: ['unclear value proposition above the fold', 'proof appears too late', 'CTA does not match buyer intent stage'],
    experiments: [
      { name: 'proof-first hero', impact: 'high', effort: 'medium' },
      { name: 'intent-matched CTA path', impact: 'high', effort: 'medium' },
      { name: 'objection FAQ block', impact: 'medium', effort: 'low' },
    ],
  };
}

export function inferCategory(brief) {
  const text = brief.toLowerCase();
  if (['silk', 'saree', 'lehenga', 'kurta', 'fashion', 'apparel', 'ethnic wear', 'textile', 'boutique', 'jewelry'].some((word) => text.includes(word))) return 'fashion brand';
  if (['marketing os', 'marketing operating system', 'go-to-market', 'gtm', 'demand gen', 'content engine', 'brand system', 'campaign planning'].some((word) => text.includes(word))) return 'marketing software';
  if (['software', 'saas', 'crm', 'platform', 'automation'].some((word) => text.includes(word))) return 'software';
  if (['clinic', 'health', 'patient', 'doctor'].some((word) => text.includes(word))) return 'healthcare service';
  if (['course', 'education', 'school', 'student'].some((word) => text.includes(word))) return 'education';
  if (['ecommerce', 'shop', 'store', 'consumer brand'].some((word) => text.includes(word))) return 'consumer brand';
  return 'digital product';
}

export function inferProblem(name, brief, category = '') {
  const cleaned = brief.trim().replace(/[.]+$/, '');
  if (!cleaned) return 'an urgent customer problem';
  const lower = cleaned.toLowerCase();
  if (['marketing os', 'marketing operating system', 'brand identity', 'market research', 'competitor intelligence', 'customer insights', 'gtm strategy', 'social content'].some((word) => lower.includes(word))) {
    return 'complete, research-backed marketing deliverables from a lightweight product brief';
  }
  if ((name || '').toLowerCase().includes('marketing os') || category === 'marketing software') {
    return 'going from a raw product brief to executive-ready marketing strategy and content without manual agency-style overhead';
  }
  const seeking = cleaned.match(/seeking\s+(.+)$/i);
  if (seeking) return seeking[1].trim().replace(/[.]+$/, '');
  const need = cleaned.match(/(?:need|needs)\s+([^.;]+)/i);
  if (need) return need[1].trim().replace(/[.]+$/, '');
  const turns = cleaned.match(/turns?\s+(.+?)\s+into\s+(.+?)(?:[.;]|$)/i);
  if (turns) return `turning ${turns[1].trim()} into ${turns[2].trim()}`;
  for (const marker of [' to ', ' helps ', ' that ']) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      const slice = cleaned.slice(idx + marker.length).trim().replace(/[.]+$/, '');
      if (marker === ' that ' && slice.split(/\s+/).length > 18) break;
      return slice;
    }
  }
  return cleaned;
}

export function problemStatement(problem = '') {
  const text = String(problem || '').trim().replace(/[.]+$/, '');
  if (!text) return 'a meaningful business outcome';
  return text;
}

export function problemNeedStatement(problem = '') {
  const text = problemStatement(problem);
  if (/^(turning|going|reducing|improving|building|creating|gett?ing|moving)\b/i.test(text)) return text;
  if (/deliverables from a lightweight product brief/i.test(text)) return text;
  return `a better way to ${text.replace(/^(to\s+)/i, '')}`;
}

export function inferAudience(name, brief, category = '') {
  const text = brief.toLowerCase();
  if (['founder', 'founders', 'operator', 'operators', 'growth lead', 'marketing team'].some((word) => text.includes(word)) || (name || '').toLowerCase().includes('marketing os') || category === 'marketing software') return 'founders, operators, and lean marketing teams';
  if (['saree', 'fashion buyers', 'bridal', 'wedding', 'festive', 'occasionwear', 'ethnic wear'].some((word) => text.includes(word))) return 'fashion-conscious women shopping for weddings, festivals, and special occasions';
  if (text.includes('clinic')) return 'clinic owners and practice managers';
  if (['b2b', 'team', 'sales', 'ops'].some((word) => text.includes(word))) return 'operators and decision-makers';
  if (['student', 'parent', 'teacher'].some((word) => text.includes(word))) return 'students and parents';
  if (['consumer', 'shopper', 'creator'].some((word) => text.includes(word))) return 'end customers';
  return 'buyers with a clear pain point';
}

export function inferBusinessModel(brief, category) {
  const text = brief.toLowerCase();
  if (category === 'marketing software' || ['subscription', 'saas', 'software', 'platform', 'crm', 'byok', 'api key', 'workflow', 'operating system'].some((word) => text.includes(word))) return 'b2b_saas';
  if (['course', 'coaching', 'cohort'].some((word) => text.includes(word))) return 'education';
  if (['clinic', 'agency', 'service'].some((word) => text.includes(word))) return 'service_business';
  if (category.includes('brand') || ['ecommerce', 'shop', 'store', 'retail', 'boutique', 'fashion', 'saree', 'apparel'].some((word) => text.includes(word))) return 'ecommerce';
  return 'generic';
}

export function inferChannels(brief, businessModel) {
  const text = brief.toLowerCase();
  const channels = [];
  if (['search', 'seo', 'traffic', 'organic'].some((word) => text.includes(word))) channels.push('seo');
  if (businessModel === 'b2b_saas' || businessModel === 'service_business') channels.push('linkedin', 'email');
  if (businessModel === 'ecommerce') channels.push('instagram', 'email');
  if (businessModel === 'education') channels.push('youtube', 'email');
  channels.push('seo', 'email', 'social');
  return [...new Set(channels)].slice(0, 5);
}

export function inferDifferentiators(brief, category) {
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

export function buildPalette(product) {
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

export function buildTagline(product) {
  if (isFashionProduct(product)) return `Woven for occasion, styled for memory.`;
  if (product.businessModel === 'b2b_saas') return `From friction to booked growth.`;
  if (product.businessModel === 'service_business') return `Operate cleaner. Convert faster.`;
  if (product.businessModel === 'ecommerce') return `Demand that feels premium and converts.`;
  return `Clarity, proof, and growth in one system.`;
}

export function inferArchetype(product) {
  if (isFashionProduct(product)) return 'The Tastemaker';
  if (product.businessModel === 'b2b_saas') return 'The Strategist';
  if (product.businessModel === 'service_business') return 'The Operator';
  if (product.businessModel === 'ecommerce') return 'The Tastemaker';
  return 'The Guide';
}

export function buildHashtags(product) {
  const tags = isFashionProduct(product)
    ? ['#SilkSaree', '#EthnicWear', '#WeddingStyle', '#FestiveFashion', '#HeritageLuxury', '#IndianFashion']
    : ['#MarketingStrategy', '#BrandSystem', '#GrowthOS'];
  if (product.businessModel === 'b2b_saas') tags.unshift('#B2BSaaS', '#DemandGen');
  if (product.businessModel === 'service_business') tags.unshift('#LeadGeneration', '#Operations');
  if (product.businessModel === 'ecommerce' && !isFashionProduct(product)) tags.unshift('#EcommerceBrand', '#PerformanceCreative');
  if (product.category.includes('health')) tags.unshift('#HealthTech', '#ClinicGrowth');
  return [...new Set(tags)].slice(0, 6);
}

export function isFashionProduct(product) {
  return product.category.includes('fashion') || /silk|saree|lehenga|kurta|apparel|boutique|ethnic/i.test(product.briefDescription || '');
}

export function gtmMotion(businessModel) {
  if (businessModel === 'b2b_saas') return 'demand capture + lead nurture + sales-assisted close';
  if (businessModel === 'ecommerce') return 'traffic + conversion + retention loop';
  if (businessModel === 'education') return 'authority content + trust build + enrollment conversion';
  return 'educate + capture + convert';
}

export function northStarMetric(businessModel) {
  if (businessModel === 'b2b_saas') return 'qualified pipeline created';
  if (businessModel === 'ecommerce') return 'revenue per visitor';
  if (businessModel === 'education') return 'enrollments';
  return 'qualified conversions';
}

export function primaryCta(businessModel) {
  if (businessModel === 'b2b_saas') return 'Book a demo or request an audit';
  if (businessModel === 'ecommerce') return 'Start with the hero offer or bundle';
  return 'Take the next qualifying action';
}
