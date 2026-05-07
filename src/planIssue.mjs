import OpenAI from 'openai';
import { parseJsonResponse } from './openaiJson.mjs';

const issuePlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'theme',
    'layoutIntent',
    'newsDensity',
    'leadVisualImportance',
    'marketImportance',
    'topTopic',
    'shortTopics',
    'marketAngle',
    'adConcepts',
    'editorialNote'
  ],
  properties: {
    theme: { type: 'string' },
    layoutIntent: {
      type: 'string',
      enum: ['feature_heavy', 'lead_image_right', 'dense_3col', 'banner_lead', 'market_ad_heavy']
    },
    newsDensity: { type: 'integer', minimum: 1, maximum: 5 },
    leadVisualImportance: { type: 'integer', minimum: 1, maximum: 5 },
    marketImportance: { type: 'integer', minimum: 1, maximum: 5 },
    topTopic: { type: 'string' },
    shortTopics: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: { type: 'string' }
    },
    marketAngle: { type: 'string' },
    adConcepts: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string' }
    },
    editorialNote: { type: 'string' }
  }
};

export async function planIssue(config) {
  const client = new OpenAI({ apiKey: config.openai.apiKey });

  const response = await client.responses.create({
    model: config.openai.textModel,
    input: [
      {
        role: 'system',
        content: [
          'You are the editor-in-chief of a fictional Japanese fantasy newspaper.',
          'Plan the issue like a real newspaper editor, but never mention real-world news, real people, real companies, real countries, or current events.',
          'Return only valid JSON matching the schema.'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `Plan the ${config.issueDate} issue of 「異世界新聞」.`,
          'Pick a layout intent based on editorial judgment.',
          'Provide five short-topic candidates and three fictional ad concepts so the composition engine can choose how many fit.'
        ].join('\n')
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'isekai_issue_plan',
        schema: issuePlanSchema,
        strict: true
      }
    }
  });

  return parseJsonResponse(response, 'issue plan');
}
