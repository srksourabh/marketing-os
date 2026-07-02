import { ANALYSIS_FIRST_SEQUENCE, DELIVERABLE_DEPENDENCIES, OPTION_INDEX, TEXT_ENCODER } from './config.js';
import { detectImageProvider, buildAssets } from './assets.js';
import { inferProduct, buildBrandSystem, buildStrategy, buildCampaignPlan } from './strategy.js';
import { buildDeliverableMap } from './deliverables.js';
import { arrayBufferToBase64 } from './utils.js';

export async function buildExperience(payload, env) {
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

export function enrichDeliverableOption(item) {
  const dependencies = DELIVERABLE_DEPENDENCIES[item.id] || [];
  const stageIndex = ANALYSIS_FIRST_SEQUENCE.indexOf(item.id);
  return {
    ...item,
    workflow_stage: stageIndex === -1 ? null : stageIndex + 1,
    dependencies,
    analysis_first: stageIndex !== -1,
  };
}

export function normalizeSelectedItems(selectedItems = []) {
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
