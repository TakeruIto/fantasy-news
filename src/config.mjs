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

function booleanEnv(name, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
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
  const imagesDir = path.join(distDir, 'images');

  return {
    rootDir,
    issueDate,
    timeZone,
    openai: {
      apiKey: required('OPENAI_API_KEY'),
      textModel: optional('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
      imageModel: optional('OPENAI_IMAGE_MODEL') || 'gpt-image-1',
      enableImageGeneration: booleanEnv('ENABLE_IMAGE_GENERATION', false)
    },
    paths: {
      distDir,
      imagesDir,
      cssPath: path.join(rootDir, 'templates', 'newspaper.css'),
      indexHtmlPath: path.join(distDir, 'index.html'),
      htmlPath: path.join(distDir, `isekai-newspaper-${issueDate}.html`),
      pdfPath: path.join(distDir, `isekai-newspaper-${issueDate}.pdf`),
      metadataPath: path.join(distDir, `isekai-newspaper-${issueDate}.json`),
      imageBasePath: path.join(imagesDir, `isekai-newspaper-${issueDate}-top`)
    }
  };
}
