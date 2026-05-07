import fs from 'node:fs/promises';
import path from 'node:path';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toHtmlPath(fromFile, targetFile) {
  return path.relative(path.dirname(fromFile), targetFile).replaceAll(path.sep, '/');
}

function paragraphize(text) {
  return escapeHtml(text)
    .split(/\n+/)
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('\n');
}

export async function renderHtml(config, articles, imageInfo, layoutPlan) {
  await fs.mkdir(config.paths.distDir, { recursive: true });

  const css = await fs.readFile(config.paths.cssPath, 'utf8');
  const imageSrc = toHtmlPath(config.paths.htmlPath, imageInfo.path);
  const headlines = [
    articles.topArticle.headline,
    ...articles.shortArticles.map((article) => article.headline),
    articles.marketReport.headline
  ];

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(articles.issueTitle)} ${escapeHtml(config.issueDate)}号</title>
  <style>${css}</style>
</head>
<body>
  <main class="paper ${escapeHtml(layoutPlan.cssClass)}" data-layout="${escapeHtml(layoutPlan.id)}">
    <header class="masthead">
      <div class="issue-meta">${escapeHtml(config.issueDate)}号 / 王都暦速報版</div>
      <h1>${escapeHtml(articles.issueTitle)}</h1>
      <div class="tagline">剣と魔法と街角の噂を、活字の香りでお届けします</div>
    </header>

    <section class="lead-grid">
      <article class="top-story">
        <div class="article-kicker">${escapeHtml(articles.topArticle.location)}発 / ${escapeHtml(articles.topArticle.reporter)}</div>
        <h2>${escapeHtml(articles.topArticle.headline)}</h2>
        <p class="deck">${escapeHtml(articles.topArticle.deck)}</p>
        ${paragraphize(articles.topArticle.body)}
      </article>
      <figure class="lead-art">
        <img src="${escapeHtml(imageSrc)}" alt="">
      </figure>
    </section>

    <section class="columns">
      ${articles.shortArticles
        .map(
          (article) => `<article class="short-story">
        <div class="article-kicker">${escapeHtml(article.location)}発</div>
        <h3>${escapeHtml(article.headline)}</h3>
        ${paragraphize(article.body)}
      </article>`
        )
        .join('\n')}

      <aside class="market">
        <h3>${escapeHtml(articles.marketReport.headline)}</h3>
        ${paragraphize(articles.marketReport.body)}
        <table>
          <tbody>
            ${articles.marketReport.items
              .map(
                (item) => `<tr>
              <th>${escapeHtml(item.name)}</th>
              <td>${escapeHtml(item.price)}</td>
              <td>${escapeHtml(item.movement)}</td>
            </tr>`
              )
              .join('\n')}
          </tbody>
        </table>
      </aside>

      ${articles.advertisements
        .map(
          (ad) => `<aside class="ad">
        <h3>${escapeHtml(ad.title)}</h3>
        <p>${escapeHtml(ad.body)}</p>
      </aside>`
        )
        .join('\n')}
    </section>

    <footer>
      <span>本紙の記事、相場、広告はすべて架空です。</span>
      <span>異世界新聞社 活版印刷局</span>
    </footer>
  </main>
</body>
</html>`;

  await fs.writeFile(config.paths.htmlPath, html, 'utf8');

  return {
    path: config.paths.htmlPath,
    headlines,
    layout: {
      id: layoutPlan.id,
      label: layoutPlan.label,
      cssClass: layoutPlan.cssClass
    }
  };
}
