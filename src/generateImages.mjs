import fs from 'node:fs/promises';
import OpenAI from 'openai';

function fallbackEngravingSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820" role="img" aria-label="">
  <rect width="1200" height="820" fill="#efe2bf"/>
  <g fill="none" stroke="#2a2319" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M70 650 C180 560 260 590 360 510 C455 435 560 450 650 360 C745 264 850 292 949 208 C1027 142 1100 156 1150 95"/>
    <path d="M76 694 C205 615 325 646 445 563 C560 484 644 502 754 407 C842 331 954 342 1112 204"/>
    <path d="M118 716 C260 666 367 691 512 619 C649 551 771 553 900 479 C1006 417 1078 428 1150 376"/>
    <path d="M525 460 L604 262 L681 460 Z"/>
    <path d="M558 460 L604 338 L650 460"/>
    <path d="M470 520 L470 415 L525 372 L580 415 L580 520"/>
    <path d="M620 520 L620 398 L687 344 L754 398 L754 520"/>
    <path d="M427 520 L790 520"/>
    <path d="M505 520 L505 459 L545 459 L545 520"/>
    <path d="M664 520 L664 447 L710 447 L710 520"/>
    <path d="M430 418 L430 356 L470 356 L470 389"/>
    <path d="M755 405 L755 340 L800 340 L800 448"/>
    <path d="M168 596 C192 525 252 493 322 518 C330 442 407 400 475 430"/>
    <path d="M836 512 C890 444 969 439 1022 490 C1049 448 1100 435 1144 462"/>
  </g>
  <g stroke="#2a2319" stroke-width="2" opacity="0.58">
    <path d="M80 754 H1120"/>
    <path d="M96 735 H1090"/>
    <path d="M132 716 H1035"/>
    <path d="M181 697 H964"/>
    <path d="M225 678 H915"/>
    <path d="M278 659 H856"/>
    <path d="M328 640 H812"/>
    <path d="M382 621 H763"/>
    <path d="M430 602 H709"/>
    <path d="M485 583 H652"/>
    <path d="M531 564 H608"/>
    <path d="M112 108 C228 72 363 77 486 123"/>
    <path d="M118 142 C249 104 356 111 469 150"/>
    <path d="M742 128 C845 92 980 94 1084 142"/>
    <path d="M764 165 C865 134 958 138 1056 176"/>
  </g>
  <g stroke="#2a2319" stroke-width="1.6" opacity="0.45">
    <path d="M0 37 H1200"/><path d="M0 74 H1200"/><path d="M0 111 H1200"/><path d="M0 148 H1200"/>
    <path d="M0 185 H1200"/><path d="M0 222 H1200"/><path d="M0 259 H1200"/><path d="M0 296 H1200"/>
    <path d="M0 333 H1200"/><path d="M0 370 H1200"/><path d="M0 407 H1200"/><path d="M0 444 H1200"/>
    <path d="M0 481 H1200"/><path d="M0 518 H1200"/><path d="M0 555 H1200"/><path d="M0 592 H1200"/>
    <path d="M0 629 H1200"/><path d="M0 666 H1200"/><path d="M0 703 H1200"/><path d="M0 740 H1200"/>
  </g>
</svg>`;
}

export async function generateTopImage(config, articles) {
  await fs.mkdir(config.paths.imagesDir, { recursive: true });

  if (!config.openai.enableImageGeneration) {
    const imagePath = `${config.paths.imageBasePath}.svg`;
    await fs.writeFile(imagePath, fallbackEngravingSvg(), 'utf8');
    return {
      path: imagePath,
      generatedByOpenAI: false,
      prompt: 'Local fallback engraving-style illustration with no embedded text.'
    };
  }

  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const response = await client.images.generate({
    model: config.openai.imageModel,
    prompt: [
      articles.imagePrompt,
      'Black ink and sepia paper, antique newspaper engraving, dense cross-hatching.',
      'No letters, no captions, no signage, no labels, no logos, no symbols, no text anywhere in the image.'
    ].join('\n'),
    size: '1024x1024',
    n: 1
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI image generation returned no image data.');

  const imagePath = `${config.paths.imageBasePath}.png`;
  await fs.writeFile(imagePath, Buffer.from(b64, 'base64'));

  return {
    path: imagePath,
    generatedByOpenAI: true,
    prompt: articles.imagePrompt
  };
}
