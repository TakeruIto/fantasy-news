import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

export async function inspectHtmlFit(config) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(config.paths.htmlPath).href, { waitUntil: 'networkidle0' });

    return await page.evaluate(() => {
      const paper = document.querySelector('.paper');
      const footer = document.querySelector('footer');
      const sections = [...document.querySelectorAll('.paper > *')];
      const paperRect = paper.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const lastBottom = Math.max(...sections.map((section) => section.getBoundingClientRect().bottom));
      const overflowPx = Math.max(0, lastBottom - paperRect.bottom, paper.scrollHeight - paper.clientHeight);

      return {
        fits: overflowPx <= 2,
        overflowPx: Math.round(overflowPx),
        paperHeight: Math.round(paperRect.height),
        contentBottom: Math.round(lastBottom - paperRect.top),
        footerBottom: Math.round(footerRect.bottom - paperRect.top)
      };
    });
  } finally {
    await browser.close();
  }
}
