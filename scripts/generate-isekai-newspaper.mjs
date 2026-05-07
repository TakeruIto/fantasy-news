import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfig } from '../src/config.mjs';
import { planIssue } from '../src/planIssue.mjs';
import { selectLayout } from '../src/layoutTemplates.mjs';
import { generateArticles } from '../src/generateArticles.mjs';
import { generateTopImage } from '../src/generateImages.mjs';
import { renderHtml } from '../src/renderHtml.mjs';
import { inspectHtmlFit } from '../src/fitPage.mjs';
import { reviseToFit } from '../src/reviseToFit.mjs';
import { createPdf } from '../src/createPdf.mjs';
import { sendMail } from '../src/sendMail.mjs';

function relativePath(config, filePath) {
  return path.relative(config.rootDir, filePath).replaceAll(path.sep, '/');
}

async function main() {
  const config = getConfig();

  await fs.mkdir(config.paths.distDir, { recursive: true });
  await fs.mkdir(config.paths.imagesDir, { recursive: true });

  console.log(`Generating 異世界新聞 ${config.issueDate}号`);

  const issuePlan = await planIssue(config);
  console.log(`Issue planned: ${issuePlan.layoutIntent}`);

  const layoutPlan = selectLayout(issuePlan);
  console.log(`Layout selected: ${layoutPlan.id}`);

  let articles = await generateArticles(config, issuePlan, layoutPlan);
  console.log(`Articles generated (${layoutPlan.shortArticleCount} short articles, ${layoutPlan.adCount} ads)`);

  const imageInfo = await generateTopImage(config, articles);
  console.log(`Top illustration ready (${imageInfo.generatedByOpenAI ? 'OpenAI image' : 'local fallback'})`);

  let htmlInfo = await renderHtml(config, articles, imageInfo, layoutPlan);
  console.log(`HTML written: ${relativePath(config, htmlInfo.path)}`);

  const fitChecks = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const fitInfo = await inspectHtmlFit(config);
    fitChecks.push({ attempt, ...fitInfo });
    console.log(fitInfo.fits ? `Page fit passed on attempt ${attempt}` : `Page overflow ${fitInfo.overflowPx}px on attempt ${attempt}`);

    if (fitInfo.fits) break;
    if (attempt === 3) break;

    articles = await reviseToFit(config, articles, layoutPlan, fitInfo, attempt);
    htmlInfo = await renderHtml(config, articles, imageInfo, layoutPlan);
    console.log(`HTML revised: ${relativePath(config, htmlInfo.path)}`);
  }

  const pdfInfo = await createPdf(config);
  console.log(`PDF written: ${relativePath(config, pdfInfo.path)}`);

  let mailError = null;
  let mailInfo;
  try {
    mailInfo = await sendMail(config, articles, pdfInfo, htmlInfo.headlines);
    console.log(mailInfo.sent ? 'Mail sent' : `Mail skipped: ${mailInfo.reason}`);
  } catch (error) {
    mailError = error;
    mailInfo = {
      sent: false,
      skipped: false,
      error: error.message
    };
    console.error(`Mail failed: ${error.message}`);
  }

  const metadata = {
    issueDate: config.issueDate,
    timeZone: config.timeZone,
    generatedAt: new Date().toISOString(),
    title: articles.issueTitle,
    topArticleTitle: articles.topArticle.headline,
    headlines: htmlInfo.headlines,
    issuePlan,
    layout: {
      id: layoutPlan.id,
      label: layoutPlan.label,
      cssClass: layoutPlan.cssClass,
      shortArticleCount: layoutPlan.shortArticleCount,
      adCount: layoutPlan.adCount,
      budgets: layoutPlan.budgets,
      selectionReason: layoutPlan.selectionReason
    },
    fitChecks,
    image: {
      path: relativePath(config, imageInfo.path),
      generatedByOpenAI: imageInfo.generatedByOpenAI,
      prompt: imageInfo.prompt
    },
    outputs: {
      html: relativePath(config, htmlInfo.path),
      pdf: relativePath(config, pdfInfo.path)
    },
    mail: mailInfo
  };

  await fs.writeFile(config.paths.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Metadata written: ${relativePath(config, config.paths.metadataPath)}`);

  if (mailError) throw mailError;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
