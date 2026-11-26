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
    const path = pathname === '/' ? '/index.html' : pathname === '/privacy' ? '/privacy.html' : pathname;
    const asset = Object.hasOwn(publicAssets, path) ? publicAssets[path] : null;
    if (!asset) return response(request, 'Not found', 'text/plain; charset=utf-8', 'no-store', 404);
    const account = path === '/index.html' ? adSettings(env).account : null;
    const content = account
      ? asset.content.replace('</head>', '<meta name="google-adsense-account" content="ca-' + account + '">\n</head>')
      : asset.content;
    return response(request, content, asset.type, path.endsWith('.html') ? 'no-cache' : 'public, max-age=300');
  },
};
