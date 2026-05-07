import OpenAI from 'openai';
import { parseJsonResponse } from './openaiJson.mjs';

const revisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['topArticle', 'shortArticles', 'marketReport', 'advertisements', 'revisionNote'],
  properties: {
    topArticle: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'deck', 'body', 'location', 'reporter'],
      properties: {
        headline: { type: 'string' },
        deck: { type: 'string' },
        body: { type: 'string' },
        location: { type: 'string' },
        reporter: { type: 'string' }
      }
    },
    shortArticles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['headline', 'body', 'location'],
        properties: {
          headline: { type: 'string' },
          body: { type: 'string' },
          location: { type: 'string' }
        }
      }
    },
    marketReport: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'body', 'items'],
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'price', 'movement'],
            properties: {
              name: { type: 'string' },
              price: { type: 'string' },
              movement: { type: 'string' }
            }
          }
        }
      }
    },
    advertisements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'body'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' }
        }
      }
    },
    revisionNote: { type: 'string' }
  }
};

function clampText(value, maxChars) {
  const text = String(value ?? '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}。`;
}

function mechanicalTighten(articles, layoutPlan, ratio) {
  const budgets = layoutPlan.budgets;
  const next = structuredClone(articles);
  const scale = (value) => Math.max(24, Math.floor(value * ratio));

  next.topArticle.headline = clampText(next.topArticle.headline, scale(budgets.topHeadline));
  next.topArticle.deck = clampText(next.topArticle.deck, scale(budgets.topDeck));
  next.topArticle.body = clampText(next.topArticle.body, scale(budgets.topBody));
  next.shortArticles = next.shortArticles.map((article) => ({
    ...article,
    headline: clampText(article.headline, scale(budgets.shortHeadline)),
    body: clampText(article.body, scale(budgets.shortBody))
  }));
  next.marketReport = {
    ...next.marketReport,
    headline: clampText(next.marketReport.headline, scale(budgets.marketHeadline)),
    body: clampText(next.marketReport.body, scale(budgets.marketBody))
  };
  next.advertisements = next.advertisements.map((ad) => ({
    title: clampText(ad.title, scale(budgets.adTitle)),
    body: clampText(ad.body, scale(budgets.adBody))
  }));

  next.revisionNote = `Mechanically tightened to ${Math.round(ratio * 100)}% of text budgets.`;
  return next;
}

export async function reviseToFit(config, articles, layoutPlan, fitInfo, attempt) {
  const ratio = fitInfo.overflowPx > 90 ? 0.72 : 0.84;

  if (!config.openai.apiKey) {
    return mechanicalTighten(articles, layoutPlan, ratio);
  }

  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const budgets = layoutPlan.budgets;
  const scaledBudgets = {
    topHeadline: Math.floor(budgets.topHeadline * ratio),
    topDeck: Math.floor(budgets.topDeck * ratio),
    topBody: Math.floor(budgets.topBody * ratio),
    shortHeadline: Math.floor(budgets.shortHeadline * ratio),
    shortBody: Math.floor(budgets.shortBody * ratio),
    marketHeadline: Math.floor(budgets.marketHeadline * ratio),
    marketBody: Math.floor(budgets.marketBody * ratio),
    adTitle: Math.floor(budgets.adTitle * ratio),
    adBody: Math.floor(budgets.adBody * ratio)
  };

  try {
    const response = await client.responses.create({
      model: config.openai.textModel,
      input: [
        {
          role: 'system',
          content: [
            'You are a Japanese newspaper copy editor.',
            'Shorten copy so it fits the allocated layout while preserving all fictional facts.',
            'Never introduce real-world news, people, companies, countries, or current events.',
            'Return only valid JSON matching the schema.'
          ].join('\n')
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              reason: `Rendered page overflowed by ${fitInfo.overflowPx}px on fit attempt ${attempt}.`,
              instruction: 'Rewrite the same issue more tightly. Keep the same item counts and market table items.',
              requiredCounts: {
                shortArticles: articles.shortArticles.length,
                advertisements: articles.advertisements.length,
                marketItems: articles.marketReport.items.length
              },
              maxJapaneseCharacters: scaledBudgets,
              articles
            },
            null,
            2
          )
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'isekai_newspaper_revision',
          schema: revisionSchema,
          strict: true
        }
      }
    });

    const revised = parseJsonResponse(response, 'revision');
    if (
      revised.shortArticles.length !== articles.shortArticles.length ||
      revised.advertisements.length !== articles.advertisements.length ||
      revised.marketReport.items.length !== articles.marketReport.items.length
    ) {
      return mechanicalTighten(articles, layoutPlan, ratio);
    }

    return {
      ...articles,
      ...revised,
      issueTitle: '異世界新聞',
      imagePrompt: articles.imagePrompt
    };
  } catch {
    return mechanicalTighten(articles, layoutPlan, ratio);
  }
}
