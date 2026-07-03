import { TEXT_ENCODER } from './config.js';
import { dataUri } from './assets.js';
import { primaryCta, northStarMetric } from './strategy.js';
import { escapeHtml, titleCase, arrayBufferToBase64 } from './utils.js';

export function buildDeliverableMap(product, brand, strategy, campaignPlan, assets) {
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
    ceo_market_report: richDocArtifact({ title: `${product.name} CEO Growth Brief`, category: 'Board pack', summary: 'Executive-ready market read, competitive pressure map, GTM strategy, and a 90-day operating plan.', html: reportHtml, filenameBase: `${product.slug}-ceo-growth-brief` }),
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
    landing_page_copy: richDocArtifact({ title: `${product.name} Landing Page Copy`, category: 'Content', summary: 'Landing page copy built around proof, buyer clarity, and one strong next step.', html: landingHtml, filenameBase: `${product.slug}-landing-page-copy` }),
    cro_recommendations: richDocArtifact({ title: `${product.name} CRO Recommendations`, category: 'Optimization', summary: 'The sharpest friction fixes and experiment list in an executive-readable format.', html: buildCroHtml(product, brand, strategy), filenameBase: `${product.slug}-cro-recommendations` }),
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

export function richDocArtifact({ title, category, summary, html, filenameBase, extraDownloads = [], previewHtml }) {
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

export function imageDownload(label, filename, image) {
  return {
    label,
    filename,
    mimeType: image.mimeType,
    base64: image.base64,
  };
}

export function socialVariantDownloads(product, assets) {
  return (assets.generatedImages.socialVariants || []).map((image, index) => imageDownload(`Download Social Variant ${index + 1}`, `${product.slug}-social-variant-${index + 1}.png`, image));
}

export function textBundleArtifact({ title, category, summary, text, filenameBase }) {
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

export function logoArtifact(product, brand, assets, logoGuideHtml) {
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

export function buildCeoReportHtml(product, brand, strategy, campaignPlan, assets) {
  const topCompetitor = strategy.competitor.competitors[0];
  return composeDoc(`${product.name} CEO Growth Brief`, brand, `Executive-ready report for ${product.name}`, `Built for ${product.audience}.`, [
    metricGrid([
      ['Category', product.category],
      ['Audience', product.audience],
      ['North-star metric', northStarMetric(product.businessModel)],
      ['Primary CTA', primaryCta(product.businessModel)],
    ]),
    section('Executive summary', `<p>${brand.promise}</p><ul>${listItems([
      strategy.positioningStatement,
      `Brand vision: ${brand.vision}`,
      `Primary demand motion: ${strategy.gtmMotion}.`,
      `First channel to lean into: ${strategy.channelPriorities[0].channel}.`,
      `First experiment to run: ${strategy.cro.experiments[0].name}.`,
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

export function buildBrandSuiteHtml(product, brand, assets) {
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

export function buildLogoGuideHtml(product, brand, assets) {
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

export function buildVoiceHtml(product, brand) {
  return composeDoc(`${product.name} Brand Voice`, brand, 'Voice system', 'How the brand should sound in public-facing communication.', [
    section('Core voice pillars', `<ul>${listItems(brand.voicePillars)}</ul>`),
    section('Messaging examples', `<div class="grid-2">${card('Good', `<p>${escapeHtml(brand.tagline)}. Built for ${product.audience} who need commercial clarity, not more software theatre.</p>`)}${card('Bad', '<p>Revolutionary next-gen solution for everyone. Powered by synergy. Completely game-changing. Horrid.</p>')}</div>`),
  ]);
}

export function buildIcpHtml(product, brand, strategy) {
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

export function buildMarketHtml(product, brand, strategy) {
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

export function buildCompetitorHtml(product, brand, strategy) {
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

export function buildCustomerHtml(product, brand, strategy) {
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

export function buildGtmHtml(product, brand, strategy, campaignPlan) {
  return composeDoc(`${product.name} GTM Strategy`, brand, 'Go-to-market strategy', 'Positioning, motion, themes, and commercial sequencing.', [
    section('Positioning statement', `<p>${escapeHtml(strategy.positioningStatement)}</p>`),
    section('Value props', `<ul>${listItems(strategy.valueProps)}</ul>`),
    section('Campaign themes', `<ul>${listItems(strategy.campaignThemes)}</ul>`),
    section('Motion + funnel', `<p><strong>Motion:</strong> ${escapeHtml(strategy.gtmMotion)}</p><ul>${listItems(strategy.funnelSummary)}</ul>`),
    section('Phase plan', table(['Phase', 'Focus'], campaignPlan.phasePlan.map((item) => [item.phase, item.focus]))),
  ]);
}

export function buildChannelHtml(product, brand, strategy) {
  return composeDoc(`${product.name} Channel Priorities`, brand, 'Channel priorities', 'Ranked channel stack and the commercial reason for each.', [
    section('Priority stack', table(['Rank', 'Channel', 'Why now'], strategy.channelPriorities.map((item) => [String(item.rank), item.channel, item.whyNow]))),
  ]);
}

export function buildCampaignHtml(product, brand, campaignPlan) {
  return composeDoc(`${product.name} 90-Day Campaign Plan`, brand, '90-day campaign plan', 'Quarter-style operating roadmap.', [
    section('Phase plan', table(['Phase', 'Focus', 'Outputs'], campaignPlan.phasePlan.map((item) => [item.phase, item.focus, item.outputs.join(', ')]))),
    section('Experiments', `<ul>${listItems(campaignPlan.experiments)}</ul>`),
    section('Funnel ownership', table(['Stage', 'Goal', 'Owner'], campaignPlan.funnelStages.map((item) => [item.stage, item.goal, item.owner]))),
  ]);
}

export function buildSeoHtml(product, brand, assets) {
  return composeDoc(`${product.name} SEO Brief`, brand, 'SEO brief', 'Commercial-intent SEO structure.', [
    section('Keyword map', metricGrid([
      ['Primary keyword', assets.seoBrief.primaryKeyword],
      ['Intent', assets.seoBrief.searchIntent],
    ])),
    section('Secondary keywords', `<ul>${listItems(assets.seoBrief.secondaryKeywords)}</ul>`),
    section('Outline', `<ol>${listItems(assets.seoBrief.outline, 'ol')}</ol>`),
  ]);
}

export function buildBlogHtml(product, brand, assets) {
  return composeDoc(`${product.name} Blog Briefs`, brand, 'Blog briefs', 'Two strong briefs for demand capture and commercial trust.', [
    section('Article briefs', `<div class="grid-2">${assets.blogBriefs.map((item) => card(item.title, `<p><strong>Angle:</strong> ${escapeHtml(item.angle)}</p><p><strong>CTA:</strong> ${escapeHtml(item.cta)}</p>`)).join('')}</div>`),
  ]);
}

export function buildSocialHtml(product, brand, assets) {
  return composeDoc(`${product.name} Social Content Pack`, brand, 'Social content pack', 'Formatted posts with hashtags, creative direction, and AI image prompts.', [
    section('Posting cadence', `<p>${escapeHtml(assets.socialPostingPlan.cadence)} across ${escapeHtml(assets.socialPostingPlan.channels.join(', '))}.</p><p><strong>Recommended image provider:</strong> ${escapeHtml(assets.imageProvider.label)}</p>`),
    section('Posts', `<div class="grid-3">${assets.socialPosts.map((post) => card(`${titleCase(post.channel)} · ${post.id}`, `<p><strong>${escapeHtml(post.hook)}</strong></p><p>${escapeHtml(post.body)}</p><p><strong>CTA:</strong> ${escapeHtml(post.cta)}</p><p><strong>Hashtags:</strong> ${escapeHtml(post.hashtags.join(' '))}</p><p><strong>Creative:</strong> ${escapeHtml(post.creativeDirection)}</p><p><strong>Image prompt:</strong> ${escapeHtml(post.imagePrompt)}</p>`)).join('')}</div>${assets.generatedImages.socialVariants?.length ? `<div class="grid-3" style="margin-top:14px">${assets.generatedImages.socialVariants.map((image, index) => card(`Social variant ${index + 1}`, `<img src="${dataUri(image)}" alt="${escapeHtml(product.name)} social variant ${index + 1}" style="width:100%;border-radius:14px;border:1px solid #dbe3f2" />`)).join('')}</div>` : ''}`),
  ]);
}

export function buildEmailHtml(product, brand, assets) {
  return composeDoc(`${product.name} Email Sequence`, brand, 'Email sequence', 'Lifecycle sequence with a clear purpose per message.', [
    section('Emails', `<div class="stack">${assets.emailSequence.map((item) => card(item.stage, `<p><strong>Subject:</strong> ${escapeHtml(item.subject)}</p><p><strong>Purpose:</strong> ${escapeHtml(item.purpose)}</p><p>${escapeHtml(item.body)}</p>`)).join('')}</div>`),
  ]);
}

export function buildLandingHtml(product, brand, assets) {
  return composeDoc(`${product.name} Landing Page Copy`, brand, 'Landing page copy', 'Proof-first landing page framework.', [
    section('Blocks', table(['Section', 'Copy'], assets.landingPage.map((item) => [item.title, item.copy]))),
  ]);
}

export function buildCroHtml(product, brand, strategy) {
  return composeDoc(`${product.name} CRO Recommendations`, brand, 'CRO recommendations', 'High-impact conversion improvements.', [
    section('Friction points', `<ul>${listItems(strategy.cro.frictionPoints)}</ul>`),
    section('Experiments', table(['Experiment', 'Impact', 'Effort'], strategy.cro.experiments.map((item) => [item.name, item.impact, item.effort]))),
  ]);
}

export function buildAnalyticsHtml(product, brand, assets) {
  return composeDoc(`${product.name} Analytics Plan`, brand, 'Analytics plan', 'Leadership scorecard and reporting rhythm.', [
    section('Scorecard', `<ul>${listItems(assets.analyticsPlan.scorecard)}</ul>`),
    section('North-star metric', `<p>${escapeHtml(assets.analyticsPlan.northStarMetric)}</p>`),
    section('Reporting cadence', `<p>${escapeHtml(assets.analyticsPlan.reportingRhythm)}</p>`),
  ]);
}

export function buildPostingPlanHtml(product, brand, assets) {
  return composeDoc(`${product.name} Social Posting Plan`, brand, 'Social posting plan', 'Cadence, mix, and working rhythm.', [
    section('Operating plan', metricGrid([
      ['Cadence', assets.socialPostingPlan.cadence],
      ['Channels', assets.socialPostingPlan.channels.join(', ')],
      ['Mix', assets.socialPostingPlan.mix.join(', ')],
    ])),
  ]);
}

export function buildBacklogHtml(product, brand, assets) {
  return composeDoc(`${product.name} Content Backlog`, brand, 'Content backlog', 'Prioritized content workstream.', [
    section('Backlog', table(['Title', 'Status', 'Outputs'], assets.contentBacklog.map((item) => [item.title, item.status, item.outputs.join(', ')]))),
  ]);
}

export function buildExecutionHtml(product, brand, assets) {
  return composeDoc(`${product.name} Execution Backlog`, brand, 'Execution backlog', 'Owner-by-owner delivery plan.', [
    section('Execution list', table(['Owner', 'Task', 'Status'], assets.executionBacklog.map((item) => [item.owner, item.task, item.status]))),
  ]);
}

export function buildDraftQueueHtml(product, brand, assets) {
  return composeDoc(`${product.name} Draft Queue`, brand, 'Draft queue', 'Approval-aware draft ledger.', [
    section('Drafts', table(['Type', 'ID', 'Status'], assets.draftQueue.items.map((item) => [item.type, item.id, item.status]))),
  ]);
}

export function buildContentPrompt(product, brand, strategy, assets) {
  return `Create a sharp marketing pack for ${product.name}.\n\nBrand:\n- Tagline: ${brand.tagline}\n- Promise: ${brand.promise}\n- Vision: ${brand.vision}\n- Positioning core: ${brand.positioningCore}\n- Voice: ${brand.voicePillars.join(', ')}\n\nProduct:\n- Category: ${product.category}\n- Audience: ${product.audience}\n- Problem solved: ${product.problem}\n- Messaging pillars: ${product.messagingPillars.join(', ')}\n\nStrategy:\n- STP positioning: ${strategy.stp.positioning}\n- Market position: ${strategy.marketPositioning}\n- GTM motion: ${strategy.gtmMotion}\n- Themes: ${strategy.campaignThemes.join(', ')}\n- Competitor weak spots: ${strategy.competitor.differentiationAngles.join(', ')}\n\nNeed:\n1. Three polished social posts with hashtags and matching image prompts\n2. One hero section rewrite\n3. One sales email\n4. One SEO/blog angle\n5. One proof-first CTA recommendation\n6. One concise competition insight\n\nConstraints:\n- Expensive, direct, and commercially fluent\n- No empty hype\n- Use proof language and clear next actions\n- Make outputs safe for founders to send internally\n\nReference hashtags: ${assets.hashtags.join(' ')}\nPreferred image workflow: ${assets.imageProvider.label}\nLogo prompt: ${assets.logoPrompt}\n`;
}


export function buildMasterBoardPackHtml(product, brand, strategy, campaignPlan, assets, deliverables) {
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

export function zipBundleArtifact(product, deliverables) {
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

export function selectBundleDownloads(id, downloads) {
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

export function downloadToBytes(download) {
  if (download.base64) return base64ToBytes(download.base64);
  return TEXT_ENCODER.encode(download.content || '');
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function createZipBase64(files) {
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

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function writeU16(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

export function writeU32(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

export function buildPerceptualMapSvg(product, strategy) {
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

export function composeDoc(title, brand, eyebrow, subtitle, sections) {
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

export function section(title, body) {
  return `<section class="doc-section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

export function card(title, body) {
  return `<article class="doc-card"><h3>${escapeHtml(title)}</h3>${body}</article>`;
}

export function twoCol(items) {
  return `<div class="grid-2">${items.join('')}</div>`;
}

export function metricGrid(items) {
  return `<div class="metric-grid">${items.map(([label, value]) => `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`).join('')}</div>`;
}

export function colorSwatches(colors) {
  return `<div class="swatches">${colors.map((color) => `<div class="swatch"><span class="chip" style="background:${color.hex}"></span><strong>${escapeHtml(color.name)}</strong><small>${escapeHtml(color.hex)} · ${escapeHtml(color.use)}</small></div>`).join('')}</div>`;
}

export function table(headers, rows) {
  return `<table><thead><tr>${headers.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function simpleDocHtml(title, body, brand) {
  return composeDoc(title, brand, 'Document', 'Clean export-ready memo.', [section(title, body)]);
}

export function wrapWordHtml(title, body) {
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${docStyles()}</head><body>${body}</body></html>`;
}

export function wrapStandaloneHtml(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>${docStyles()}</head><body>${body}</body></html>`;
}

export function docStyles() {
  return `<style>
    :root { --bg:#f5f8ff; --ink:#0f172a; --muted:#475569; --panel:#ffffff; --line:#dbe3f2; --accent:#79A7FF; --accent2:#31D5B3; }
    *{box-sizing:border-box} body{margin:0;padding:32px;background:var(--bg);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.6} .doc-shell{max-width:1080px;margin:0 auto} .doc-hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;padding:28px;border-radius:24px;background:linear-gradient(135deg,#0f172a,#16213e);color:#fff;margin-bottom:24px} .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#bfdbfe;margin-bottom:10px}.subtitle{color:#cbd5e1}.tagline{color:#86efac;font-weight:700}.palette-card{background:rgba(255,255,255,.08);padding:18px;border-radius:18px;border:1px solid rgba(255,255,255,.14)} .doc-section{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:22px;margin:0 0 18px;break-inside:avoid} h1,h2,h3{margin:0 0 12px} h1{font-size:38px;line-height:1.05} h2{font-size:24px} h3{font-size:17px} p{margin:0 0 12px} ul,ol{margin:0 0 0 18px;padding:0} table{width:100%;border-collapse:collapse;font-size:14px} th,td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left} th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b} .grid-2,.grid-3,.metric-grid,.swatches,.stack{display:grid;gap:14px}.grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.doc-card{border:1px solid var(--line);border-radius:18px;padding:16px;background:#fbfdff}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric{padding:16px;border:1px solid var(--line);border-radius:18px;background:#fbfdff}.metric-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.metric-value{font-size:18px;font-weight:700;margin-top:6px}.swatch{display:grid;gap:6px;padding:12px;border:1px solid var(--line);border-radius:16px;background:#fff}.chip{display:block;width:100%;height:38px;border-radius:12px}.logo-preview svg{max-width:90px;height:auto} pre{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;padding:16px;border-radius:16px;overflow:auto}@media print{body{background:#fff;padding:0}.doc-section{break-inside:avoid-page}.doc-hero{break-inside:avoid-page}} @media (max-width:860px){.doc-hero,.grid-2,.grid-3,.metric-grid{grid-template-columns:1fr}}
  </style>`;
}

export function htmlList(items) {
  return `<ul>${listItems(items.map(([label, value]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`), 'html')}</ul>`;
}

export function listItems(items, mode = 'ul') {
  if (mode === 'html') return items.map((item) => `<li>${item}</li>`).join('');
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}
