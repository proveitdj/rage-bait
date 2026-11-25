import { handleSupporter } from './supporter.js';

function adSettings(env) {
  const publisher = String(env.ADSENSE_PUBLISHER || '').trim();
  const slot = String(env.ADSENSE_STAGE_SLOT || '').trim();
  const account = publisher.match(/^(?:ca-)?(pub-\d{16})$/)?.[1] || null;
  const ads = account && /^\d{5,20}$/.test(slot) && env.ADSENSE_CMP === 'google'
    ? { publisher: 'ca-' + account, slot, cmp: 'google' }
    : null;
  return { account, ads };
}

const privacy = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy · Rage Bait</title>
<style>body{margin:0;padding:28px;background:#171610;color:#fff1d9;font:1rem/1.6 system-ui,sans-serif}main{max-width:650px;margin:auto}a{color:#ffc64f}h1{line-height:1.1}</style>
<main>
<p><a href="/">Back to Rage Bait</a></p>
<h1>Privacy</h1>
<p>Rage Bait saves campaign progress, daily results, and cosmetic choices in your browser. Shared results include the challenge date, run time, and death count you choose to share.</p>
<p>Stripe handles supporter payments on its hosted checkout. Rage Bait uses a browser cookie to recognise a completed purchase. <a href="https://stripe.com/privacy">Stripe’s privacy policy</a></p>
<p>When ads are enabled, Google may use cookies or similar technologies to show and measure ads. Use Privacy and cookie settings to change your choices when the Google tool is available. <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites that use its services</a></p>
</main></html>`;

function response(request, value, type, cache = 'no-cache', status = 200) {
  return new Response(request.method === 'HEAD' ? null : value, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/supporter/')) {
      return handleSupporter(request, env);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return response(request, 'Method not allowed', 'text/plain; charset=utf-8', 'no-store', 405);
    }
    if (pathname === '/api/site-config') {
      return response(request, JSON.stringify({ ads: adSettings(env).ads }), 'application/json', 'no-store');
    }
    if (pathname === '/ads.txt') {
      const account = adSettings(env).account;
      return account
        ? response(request, 'google.com, ' + account + ', DIRECT, f08c47fec0942fa0\n', 'text/plain; charset=utf-8')
        : response(request, 'Not found', 'text/plain; charset=utf-8', 'no-store', 404);
    }
    if (pathname === '/privacy') {
      return response(request, privacy, 'text/html; charset=utf-8');
    }
    const path = pathname === '/' ? '/index.html' : pathname;
    const asset = Object.hasOwn(publicAssets, path) ? publicAssets[path] : null;
    if (!asset) return response(request, 'Not found', 'text/plain; charset=utf-8', 'no-store', 404);
    const account = path === '/index.html' ? adSettings(env).account : null;
    const content = account
      ? asset.content.replace('</head>', '<meta name="google-adsense-account" content="ca-' + account + '">\n</head>')
      : asset.content;
    return response(request, content, asset.type, path.endsWith('.html') ? 'no-cache' : 'public, max-age=300');
  },
};
