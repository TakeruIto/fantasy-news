export const layoutTemplates = {
  feature_heavy: {
    id: 'feature_heavy',
    label: 'Feature-heavy front page',
    cssClass: 'layout-feature',
    shortArticleCount: 3,
    adCount: 2,
    budgets: {
      topHeadline: 22,
      topDeck: 72,
      topBody: 620,
      shortHeadline: 18,
      shortBody: 145,
      marketHeadline: 14,
      marketBody: 120,
      adTitle: 12,
      adBody: 48
    }
  },
  lead_image_right: {
    id: 'lead_image_right',
    label: 'Balanced lead image page',
    cssClass: 'layout-balanced',
    shortArticleCount: 3,
    adCount: 3,
    budgets: {
      topHeadline: 22,
      topDeck: 62,
      topBody: 520,
      shortHeadline: 17,
      shortBody: 132,
      marketHeadline: 14,
      marketBody: 105,
      adTitle: 12,
      adBody: 42
    }
  },
  dense_3col: {
    id: 'dense_3col',
    label: 'Dense three-column edition',
    cssClass: 'layout-dense',
    shortArticleCount: 5,
    adCount: 2,
    budgets: {
      topHeadline: 20,
      topDeck: 54,
      topBody: 410,
      shortHeadline: 16,
      shortBody: 98,
      marketHeadline: 13,
      marketBody: 92,
      adTitle: 12,
      adBody: 38
    }
  },
  banner_lead: {
    id: 'banner_lead',
    label: 'Wide banner lead page',
    cssClass: 'layout-banner',
    shortArticleCount: 4,
    adCount: 2,
    budgets: {
      topHeadline: 24,
      topDeck: 58,
      topBody: 460,
      shortHeadline: 16,
      shortBody: 112,
      marketHeadline: 13,
      marketBody: 95,
      adTitle: 12,
      adBody: 40
    }
  },
  market_ad_heavy: {
    id: 'market_ad_heavy',
    label: 'Market and notices page',
    cssClass: 'layout-market',
    shortArticleCount: 4,
    adCount: 3,
    budgets: {
      topHeadline: 20,
      topDeck: 54,
      topBody: 390,
      shortHeadline: 15,
      shortBody: 92,
      marketHeadline: 14,
      marketBody: 135,
      adTitle: 12,
      adBody: 38
    }
  }
};

export function selectLayout(issuePlan) {
  const density = Number(issuePlan?.newsDensity ?? 3);
  const visual = Number(issuePlan?.leadVisualImportance ?? 3);
  const market = Number(issuePlan?.marketImportance ?? 3);
  const intent = issuePlan?.layoutIntent;

  let id = 'lead_image_right';
  if (intent === 'feature_heavy') id = 'feature_heavy';
  else if (intent === 'dense_3col') id = 'dense_3col';
  else if (intent === 'banner_lead') id = 'banner_lead';
  else if (intent === 'market_ad_heavy') id = 'market_ad_heavy';
  else if (market >= 5) id = 'market_ad_heavy';
  else if (density >= 5) id = 'dense_3col';
  else if (visual >= 5) id = 'banner_lead';
  else if (density <= 2) id = 'feature_heavy';

  const template = layoutTemplates[id];
  return {
    ...template,
    budgets: { ...template.budgets },
    selectionReason: `intent=${intent ?? 'auto'}, density=${density}, visual=${visual}, market=${market}`
  };
}
