import fs from 'node:fs/promises';
import OpenAI from 'openai';

export async function generateNewspaperImage(config) {
  await fs.mkdir(config.paths.newspapersDir, { recursive: true });

  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const response = await client.images.generate({
    model: config.openai.imageModel,
    prompt: config.openai.newspaperPrompt,
    size: '1024x1536',
    n: 1
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI image generation returned no image data.');

  await fs.writeFile(config.paths.newspaperPngPath, Buffer.from(b64, 'base64'));

  return {
    path: config.paths.newspaperPngPath,
    prompt: config.openai.newspaperPrompt,
    model: config.openai.imageModel
  };
}
