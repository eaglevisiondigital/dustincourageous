#!/usr/bin/env node
'use strict';

// Add server-delivered social preview metadata without changing page bodies.
// Also enforce the current paperback price across every HTML page at deploy time.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://dustincourageous.com';
const IMAGE_NAME = 'dustin-courageous-share-v1.jpg';
const IMAGE_URL = `${ORIGIN}/${IMAGE_NAME}`;
const IMAGE_SHA256 = '6056aca7cd5eac56188f5c5c6c77eef7d80a6d2a1fe8b76e49116be07edf2c30';
const IMAGE_ALT = 'Dustin Courageous in his red cape with a foot resting on the defeated cartoon devil, beside the words No Fear Here! Faith. Courage. Victory.';
const FALLBACK_DESCRIPTION = 'Faith-filled books, gear, the Adventure Club, and free printable resources to help kids grow in faith, courage, and victory in Christ.';
const START = '<!-- DUSTIN COURAGEOUS SOCIAL PREVIEW: START -->';
const END = '<!-- DUSTIN COURAGEOUS SOCIAL PREVIEW: END -->';
const SKIP = new Set(['.git', '.netlify', 'node_modules', 'scripts', 'tests']);

function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (whole, token) => {
    if (token[0] === '#') {
      const n = token[1].toLowerCase() === 'x'
        ? parseInt(token.slice(2), 16) : parseInt(token.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n) : whole;
    }
    return ({amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '})[token.toLowerCase()];
  });
}
function escape(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function attrs(tag) {
  const found = {};
  const re = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>`=]+))/g;
  for (const m of tag.matchAll(re)) found[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4]);
  return found;
}
function text(value) {
  return decode(value.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}
function htmlFiles(dir) {
  const found = [];
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    if (ent.isSymbolicLink() || SKIP.has(ent.name) || ent.name.startsWith('.')) continue;
    const target = path.join(dir, ent.name);
    if (ent.isDirectory()) found.push(...htmlFiles(target));
    else if (ent.isFile() && /\.html?$/i.test(ent.name)) found.push(target);
  }
  return found.sort();
}
function aliases() {
  const map = new Map();
  const file = path.join(ROOT, '_redirects');
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length >= 3 && /^200!?$/.test(fields[2]) && /^\/(?!\/)/.test(fields[0])
      && !/[\*:]/.test(fields[0]) && /^\/.*\.html?$/i.test(fields[1])) {
      map.set(fields[1].slice(1), fields[0]);
    }
  }
  return map;
}
function pageUrl(rel, head, rewrites) {
  for (const tag of head.match(/<link\b[^>]*>/gi) || []) {
    const a = attrs(tag);
    if ((a.rel || '').split(/\s+/).includes('canonical') && a.href) {
      const candidate = new URL(a.href, ORIGIN);
      if (['dustincourageous.com', 'www.dustincourageous.com'].includes(candidate.hostname)) {
        candidate.protocol = 'https:';
        candidate.hostname = 'dustincourageous.com';
        candidate.search = ''; candidate.hash = '';
        return candidate.href;
      }
    }
  }
  if (rewrites.has(rel)) return ORIGIN + rewrites.get(rel);
  const route = rel.replace(/(^|\/)index\.html?$/i, '$1');
  return ORIGIN + '/' + route.split('/').map(encodeURIComponent).join('/');
}
function apply(html, rel, rewrites) {
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html);
  if (!headMatch) throw new Error(`No HTML head found in ${rel}`);
  let head = headMatch[1];
  const start = head.indexOf(START);
  if (start >= 0) {
    const end = head.indexOf(END, start);
    if (end < 0) throw new Error(`Incomplete social preview block in ${rel}`);
    head = head.slice(0, start) + head.slice(end + END.length);
  }
  const rawTitle = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head);
  let title = rawTitle ? text(rawTitle[1]) : 'Dustin Courageous | No Fear Here!';
  if (rel === 'index.html') title = 'Dustin Courageous | No Fear Here!';
  let description = FALLBACK_DESCRIPTION;
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const a = attrs(tag);
    if ((a.name || '').toLowerCase() === 'description' && a.content && a.content.length > 70) {
      description = a.content.trim();
    }
  }
  const canonical = pageUrl(rel, head, rewrites);
  head = head.replace(/<meta\b[^>]*>/gi, tag => {
    const a = attrs(tag);
    const key = (a.property || a.name || '').toLowerCase();
    return /^(og:|twitter:)/.test(key) ? '' : tag;
  });
  const og = {
    'og:type': 'website', 'og:site_name': 'Dustin Courageous', 'og:locale': 'en_US',
    'og:title': title, 'og:description': description, 'og:url': canonical,
    'og:image': IMAGE_URL, 'og:image:secure_url': IMAGE_URL, 'og:image:type': 'image/jpeg',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': IMAGE_ALT
  };
  const tw = {'twitter:card': 'summary_large_image', 'twitter:title': title,
    'twitter:description': description, 'twitter:image': IMAGE_URL, 'twitter:image:alt': IMAGE_ALT};
  const block = START + '\n'
    + Object.entries(og).map(([k,v]) => `<meta property="${k}" content="${escape(v)}">`).join('\n') + '\n'
    + Object.entries(tw).map(([k,v]) => `<meta name="${k}" content="${escape(v)}">`).join('\n') + '\n' + END;
  const offset = headMatch.index + headMatch[0].indexOf('>') + 1;
  const ending = offset + headMatch[1].length;
  return html.slice(0, offset) + head + block + html.slice(ending);
}
function applyPricing(html) {
  return html.replace(/\$12\.99/g, '$14.99');
}
function main() {
  const rewrites = aliases();
  const pages = htmlFiles(ROOT);
  const imagePath = path.join(ROOT, IMAGE_NAME);
  const hasApprovedImage = fs.existsSync(imagePath);

  if (hasApprovedImage) {
    const image = fs.readFileSync(imagePath);
    if (crypto.createHash('sha256').update(image).digest('hex') !== IMAGE_SHA256) {
      throw new Error('Social preview artwork differs from the approved optimized JPEG.');
    }
  } else {
    console.warn(`[social-preview] Awaiting ${IMAGE_NAME}; pricing update will still be applied.`);
  }

  const updates = pages.map(file => {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    let html = applyPricing(fs.readFileSync(file, 'utf8'));
    if (hasApprovedImage) html = apply(html, rel, rewrites);
    return [file, html];
  });

  for (const [file, html] of updates) fs.writeFileSync(file, html, 'utf8');
  console.log(`[site-update] Paperback price set to $14.99 across ${updates.length} HTML pages.`);
  if (hasApprovedImage) {
    console.log(`[social-preview] Approved 1200x630 artwork connected to ${updates.length} HTML pages.`);
  }
}
if (require.main === module) main();
module.exports = {apply, applyPricing, main};
