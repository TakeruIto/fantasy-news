import OpenAI from 'openai';
import { parseJsonResponse } from './openaiJson.mjs';

const newspaperStyleRules = [
  'Write in sober Japanese newspaper style, not story prose, ad copy, or a fantasy novel narration.',
  'Use だ・である調 only. Do not use です, ます, ました, でしょう, ください, お届けします, or polite endings.',
  'Use an inverted-pyramid structure: first paragraph states who did what, when, where, and why it matters; later sentences add background, figures, reactions, and outlook.',
  'Keep the tone detached and factual. Avoid emotional or promotional phrases such as 爆発的な人気, 幕開け, 期待されています, 波紋を呼びました, 熾烈な競争を展開しています.',
  'Prefer newspaper verbs such as 発表した, 明らかにした, 確認した, 指摘した, 警戒感を示した, 求めた, 述べた, との見方を示した.',
  'Use specific fictional institutions, dates, places, quantities, and attributed comments so articles read like reported facts.',
  'Paragraphs should be compact, with each paragraph covering one news point. Do not end with a hopeful story-like conclusion.'
];

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
          'Keep everything fictional, self-contained, and suitable for a one-page A4 newspaper.',
          ...newspaperStyleRules,
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
              'All article bodies, decks, headlines, locations, and market copy must follow だ・である調 and avoid です・ます調.',
              'Write the top article like a straight news article: lead with a fictional authority, guild, bureau, council, exchange, or academy announcing or confirming a concrete development on the issue date.',
              'Use two or three short newspaper paragraphs in topArticle.body, separated by newline characters.',
              'Short articles should also begin with reported facts, not scenery, rumors, or narrative setup.',
              'MarketReport should read like a market column with observed price movement and attributed causes, not a shopping recommendation.',
              'Advertisements may be more compact, but still avoid です・ます調.',
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
