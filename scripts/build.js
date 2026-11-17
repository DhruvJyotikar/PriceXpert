'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const apiBase = (process.env.PRICE_XPERT_API_BASE || '').trim();

if (apiBase) {
  let parsedApiBase;
  try {
    parsedApiBase = new URL(apiBase);
  } catch {
    throw new Error('PRICE_XPERT_API_BASE must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(parsedApiBase.protocol) || parsedApiBase.pathname !== '/' || parsedApiBase.search || parsedApiBase.hash) {
    throw new Error('PRICE_XPERT_API_BASE must be an HTTP(S) origin without a path, query, or fragment.');
  }
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const file of ['index.html', 'main.js', 'style.css']) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

fs.writeFileSync(
  path.join(outputDirectory, 'api-config.js'),
  `window.PRICE_XPERT_API_BASE = ${JSON.stringify(apiBase ? new URL(apiBase).origin : '')};\n`
);

console.log(`Built PriceXpert static site in ${outputDirectory}`);
