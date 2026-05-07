import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfig } from '../src/config.mjs';
import { generateNewspaperImage } from '../src/generateNewspaperImage.mjs';
import { renderGallery } from '../src/renderGallery.mjs';

function relativePath(config, filePath) {
  return path.relative(config.rootDir, filePath).replaceAll(path.sep, '/');
}

async function main() {
  const config = getConfig();

  await fs.mkdir(config.paths.distDir, { recursive: true });
  await fs.mkdir(config.paths.newspapersDir, { recursive: true });
  await fs.mkdir(config.paths.issuesDir, { recursive: true });

  console.log(`Generating 異世界新聞 ${config.issueDate}号 as a PNG`);

  const imageInfo = await generateNewspaperImage(config);
  console.log(`Newspaper image written: ${relativePath(config, imageInfo.path)}`);

  const metadata = {
    issueDate: config.issueDate,
    timeZone: config.timeZone,
    generatedAt: new Date().toISOString(),
    prompt: imageInfo.prompt,
    model: imageInfo.model,
    outputs: {
      image: relativePath(config, imageInfo.path)
    }
  };
  await fs.writeFile(config.paths.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Metadata written: ${relativePath(config, config.paths.metadataPath)}`);

  const gallery = await renderGallery(config);
  console.log(`Gallery written: ${relativePath(config, gallery.path)} (${gallery.issues.length} issues)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
