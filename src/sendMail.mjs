import fs from 'node:fs/promises';
import path from 'node:path';
import { Resend } from 'resend';

function missingMailConfig(config) {
  return ['resendApiKey', 'to', 'from'].filter((name) => !config.mail[name]);
}

export async function sendMail(config, articles, pdfInfo, headlines) {
  const missing = missingMailConfig(config);
  if (missing.length > 0) {
    return {
      sent: false,
      skipped: true,
      reason: `Missing mail configuration: ${missing.join(', ')}`
    };
  }

  const resend = new Resend(config.mail.resendApiKey);
  const pdf = await fs.readFile(pdfInfo.path);
  const subject = `[異世界新聞] ${config.issueDate}号`;
  const text = [
    `${articles.topArticle.headline}`,
    '',
    '見出し一覧:',
    ...headlines.map((headline) => `- ${headline}`),
    '',
    'PDF版の異世界新聞を添付しています。'
  ].join('\n');

  const result = await resend.emails.send({
    from: config.mail.from,
    to: config.mail.to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(pdfInfo.path),
        content: pdf.toString('base64')
      }
    ]
  });

  if (result.error) {
    throw new Error(`Resend failed to send mail: ${result.error.message}`);
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id ?? null
  };
}
