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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listNewspaperIssues(config) {
  await fs.mkdir(config.paths.newspapersDir, { recursive: true });

  const entries = await fs.readdir(config.paths.newspapersDir, { withFileTypes: true });
  const issues = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^\d{4}-\d{2}-\d{2}\.png$/.test(entry.name)) continue;
    const date = entry.name.replace(/\.png$/, '');
    const imagePath = path.join(config.paths.newspapersDir, entry.name);
    const metadataPath = path.join(config.paths.issuesDir, `${date}.json`);
    let metadata = {};
    if (await pathExists(metadataPath)) {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    }
    issues.push({
      date,
      image: toHtmlPath(config.paths.indexHtmlPath, imagePath),
      prompt: metadata.prompt ?? '',
      model: metadata.model ?? ''
    });
  }

  return issues.sort((a, b) => b.date.localeCompare(a.date));
}

export async function renderGallery(config) {
  await fs.mkdir(config.paths.distDir, { recursive: true });
  const issues = await listNewspaperIssues(config);
  if (issues.length === 0) throw new Error('No newspaper PNG files found in dist/newspapers.');

  const issueJson = JSON.stringify(issues);
  const active = issues[0];
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>異世界新聞</title>
  <style>
    :root {
      --bg: #171513;
      --panel: #221e1a;
      --panel-strong: #2d2721;
      --line: rgba(238, 224, 190, 0.22);
      --text: #f2e7cf;
      --muted: #b9a98b;
      --accent: #d7b56d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background: radial-gradient(circle at 65% 18%, rgba(130, 96, 41, 0.2), transparent 30%), var(--bg);
      font-family: "Yu Gothic", "Hiragino Sans", "Noto Sans CJK JP", system-ui, sans-serif;
    }

    .app {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      min-height: 100vh;
    }

    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 22px 14px;
      overflow-y: auto;
      border-right: 1px solid var(--line);
      background: linear-gradient(180deg, var(--panel-strong), var(--panel));
    }

    h1 {
      margin: 0 0 18px;
      font-size: 22px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    .issue-list {
      display: grid;
      gap: 8px;
    }

    .issue-button {
      width: 100%;
      padding: 11px 12px;
      border: 1px solid var(--line);
      color: var(--text);
      background: rgba(255, 255, 255, 0.03);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .issue-button[aria-current="true"] {
      border-color: rgba(215, 181, 109, 0.8);
      color: #fff6df;
      background: rgba(215, 181, 109, 0.18);
    }

    main {
      min-width: 0;
      padding: 24px;
    }

    .viewer {
      max-width: 1080px;
      margin: 0 auto;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 14px;
    }

    .date {
      color: var(--text);
      font-size: 18px;
      font-weight: 700;
    }

    .paper-frame {
      display: grid;
      place-items: center;
      min-height: calc(100vh - 88px);
    }

    .paper-frame img {
      display: block;
      width: min(100%, 980px);
      height: auto;
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
      background: #e8d9b7;
    }

    @media (max-width: 760px) {
      .app {
        grid-template-columns: 1fr;
      }

      aside {
        position: static;
        height: auto;
        padding: 14px;
      }

      .issue-list {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }

      .issue-button {
        min-width: 128px;
        white-space: nowrap;
      }

      main {
        padding: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <h1>異世界新聞</h1>
      <nav class="issue-list" aria-label="発行日">
        ${issues
          .map(
            (issue, index) => `<button class="issue-button" type="button" data-index="${index}" aria-current="${index === 0 ? 'true' : 'false'}">${escapeHtml(issue.date)}</button>`
          )
          .join('\n        ')}
      </nav>
    </aside>
    <main>
      <section class="viewer">
        <div class="meta">
          <div><span class="date" id="issue-date">${escapeHtml(active.date)}</span> 発行</div>
          <div id="issue-model">${escapeHtml(active.model)}</div>
        </div>
        <div class="paper-frame">
          <img id="newspaper-image" src="${escapeHtml(active.image)}" alt="${escapeHtml(active.date)}発行の異世界新聞">
        </div>
      </section>
    </main>
  </div>
  <script>
    const issues = ${issueJson};
    const buttons = [...document.querySelectorAll('.issue-button')];
    const date = document.getElementById('issue-date');
    const model = document.getElementById('issue-model');
    const image = document.getElementById('newspaper-image');

    function showIssue(index) {
      const issue = issues[index];
      if (!issue) return;
      buttons.forEach((button, buttonIndex) => {
        button.setAttribute('aria-current', String(buttonIndex === index));
      });
      date.textContent = issue.date;
      model.textContent = issue.model || '';
      image.src = issue.image;
      image.alt = issue.date + '発行の異世界新聞';
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => showIssue(Number(button.dataset.index)));
    });
  </script>
</body>
</html>`;

  await fs.writeFile(config.paths.indexHtmlPath, html, 'utf8');
  await fs.writeFile(config.paths.manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), issues }, null, 2)}\n`, 'utf8');

  return {
    path: config.paths.indexHtmlPath,
    issues
  };
}
