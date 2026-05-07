import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Set it in GitHub Actions Secrets or your local .env file.`);
  }
  return value;
}

function optional(name) {
  const value = process.env[name]?.trim();
  return value || '';
}

function dateInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function getConfig() {
  const timeZone = optional('ISSUE_TIME_ZONE') || 'Asia/Tokyo';
  const issueDate = dateInTimeZone(timeZone);
  const distDir = path.join(rootDir, 'dist');
  const newspapersDir = path.join(distDir, 'newspapers');
  const issuesDir = path.join(distDir, 'issues');

  return {
    rootDir,
    issueDate,
    timeZone,
    openai: {
      apiKey: required('OPENAI_API_KEY'),
      imageModel: optional('OPENAI_IMAGE_MODEL') || 'gpt-image-1',
      newspaperPrompt: optional('NEWSPAPER_IMAGE_PROMPT') || '異世界で発行されている新聞を作って。'
    },
    paths: {
      distDir,
      newspapersDir,
      issuesDir,
      indexHtmlPath: path.join(distDir, 'index.html'),
      metadataPath: path.join(issuesDir, `${issueDate}.json`),
      newspaperPngPath: path.join(newspapersDir, `${issueDate}.png`),
      manifestPath: path.join(distDir, 'manifest.json')
    }
  };
}
