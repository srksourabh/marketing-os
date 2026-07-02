export const DELIVERABLE_OPTIONS = [
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

export const OPTION_INDEX = Object.fromEntries(DELIVERABLE_OPTIONS.map((item) => [item.id, item.label]));
export const ANALYSIS_FIRST_SEQUENCE = ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite', 'logo_pack', 'social_posts'];
export const DELIVERABLE_DEPENDENCIES = {
  brand_identity_suite: ['market_research', 'competitor_intel', 'customer_insights'],
  logo_pack: ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite'],
  social_posts: ['market_research', 'competitor_intel', 'customer_insights', 'brand_identity_suite', 'logo_pack'],
};
export const TEXT_ENCODER = new TextEncoder();
