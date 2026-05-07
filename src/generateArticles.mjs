import OpenAI from 'openai';
import { parseJsonResponse } from './openaiJson.mjs';

function newspaperSchema(layoutPlan) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['issueTitle', 'topArticle', 'shortArticles', 'marketReport', 'advertisements', 'imagePrompt'],
    properties: {
      issueTitle: { type: 'string' },
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
        minItems: layoutPlan.shortArticleCount,
        maxItems: layoutPlan.shortArticleCount,
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
            minItems: 4,
            maxItems: 6,
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
        minItems: layoutPlan.adCount,
        maxItems: layoutPlan.adCount,
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
      imagePrompt: { type: 'string' }
    }
  };
}

function assertShape(articleSet, layoutPlan) {
  if (!articleSet?.topArticle?.headline || !articleSet?.topArticle?.body) {
    throw new Error('Generated article data is missing the top article.');
  }
  if (!Array.isArray(articleSet.shortArticles) || articleSet.shortArticles.length !== layoutPlan.shortArticleCount) {
    throw new Error(`Generated article data must include exactly ${layoutPlan.shortArticleCount} short articles.`);
  }
  if (!articleSet.marketReport?.items?.length) {
    throw new Error('Generated article data is missing the market report.');
  }
  if (!Array.isArray(articleSet.advertisements) || articleSet.advertisements.length !== layoutPlan.adCount) {
    throw new Error(`Generated article data must include exactly ${layoutPlan.adCount} advertisements.`);
  }
}

export async function generateArticles(config, issuePlan, layoutPlan) {
  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const selectedTopics = issuePlan.shortTopics.slice(0, layoutPlan.shortArticleCount);
  const selectedAds = issuePlan.adConcepts.slice(0, layoutPlan.adCount);

  const response = await client.responses.create({
    model: config.openai.textModel,
    input: [
      {
        role: 'system',
        content: [
          'You write a fictional Japanese fantasy newspaper.',
          'Never use real-world news, real people, real companies, real countries, or current events.',
          'Keep everything playful, self-contained, and suitable for a one-page A4 newspaper.',
          'Respect the provided character budgets because a mechanical typesetter will fit the issue into one A4 page.',
          'Return only valid JSON matching the provided schema.'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            issueDate: config.issueDate,
            issueTitle: '異世界新聞',
            issuePlan,
            selectedLayout: {
              id: layoutPlan.id,
              label: layoutPlan.label,
              shortArticleCount: layoutPlan.shortArticleCount,
              adCount: layoutPlan.adCount,
              budgets: layoutPlan.budgets
            },
            selectedTopics,
            selectedAds,
            instructions: [
              'Use Japanese.',
              `Create exactly ${layoutPlan.shortArticleCount} short articles and exactly ${layoutPlan.adCount} fictional advertisements.`,
              'Headlines should be compact enough for old newspaper columns.',
              'The imagePrompt must describe a newspaper engraving style illustration for the top article.',
              'The imagePrompt must explicitly forbid letters, captions, signs, logos, and any text inside the image.'
            ],
            maxJapaneseCharacters: {
              topHeadline: layoutPlan.budgets.topHeadline,
              topDeck: layoutPlan.budgets.topDeck,
              topBody: layoutPlan.budgets.topBody,
              shortHeadlineEach: layoutPlan.budgets.shortHeadline,
              shortBodyEach: layoutPlan.budgets.shortBody,
              marketHeadline: layoutPlan.budgets.marketHeadline,
              marketBody: layoutPlan.budgets.marketBody,
              adTitleEach: layoutPlan.budgets.adTitle,
              adBodyEach: layoutPlan.budgets.adBody
            }
          },
          null,
          2
        )
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'isekai_newspaper',
        schema: newspaperSchema(layoutPlan),
        strict: true
      }
    }
  });

  const articleSet = parseJsonResponse(response, 'article');
  assertShape(articleSet, layoutPlan);

  return {
    ...articleSet,
    issueTitle: '異世界新聞'
  };
}
