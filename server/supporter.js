const AMOUNT = 199;
const CURRENCY = 'gbp';
const PACK = 'rage-bait-supporter-v1';
const PUBLIC_ORIGIN = 'https://rage-bait-arcade.sacredhedgehog.chatgpt.site';
const RECEIPT = '__Host-rage-supporter';
const CHECKOUT_COOKIE_PREFIX = '__Host-rage-checkout-';
const COOKIE_FLAGS = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const RECEIPT_AGE = 400 * 24 * 60 * 60;
const RECEIPT_RENEWAL = 90 * 24 * 60 * 60;
const CHECKOUT_AGE = 30 * 24 * 60 * 60;
const SESSION_ID = /^cs_(?:live|test)_[A-Za-z0-9]{8,192}$/;
const RANDOM_VALUE = /^[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();

function configuration(requestUrl, env) {
  let site;
  try {
    site = new URL(env.SUPPORTER_ORIGIN || PUBLIC_ORIGIN);
  } catch {
    return { trusted: false, enabled: false };
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname);
  const test = local && env.SUPPORTER_TEST_MODE === '1';
  const trusted = !site.username && !site.password && site.pathname === '/' &&
    !site.search && !site.hash && (site.protocol === 'https:' || test && site.protocol === 'http:') &&
    site.origin === requestUrl.origin;
  const stripeKeyShape = test ? /^(?:rk|sk)_test_[A-Za-z0-9_]{8,}$/ : /^rk_live_[A-Za-z0-9_]{8,}$/;
  const signingKey = typeof env.SUPPORTER_SIGNING_KEY === 'string' && env.SUPPORTER_SIGNING_KEY.length >= 43
    ? env.SUPPORTER_SIGNING_KEY
    : null;
  const stripeKey = stripeKeyShape.test(env.STRIPE_SECRET_KEY || '') ? env.STRIPE_SECRET_KEY : null;
  return { trusted, enabled: trusted && Boolean(signingKey && stripeKey), signingKey, stripeKey,
    origin: site.origin, livemode: !test };
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomValue() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function cookieValue(request, name) {
  const prefix = name + '=';
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }
  return '';
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Max-Age=${maxAge}; ${COOKIE_FLAGS}`;
}

function checkoutCookie(sessionId) {
  return CHECKOUT_COOKIE_PREFIX + sessionId;
}

async function importSigningKey(secret) {
  if (!secret) return null;
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false,
    ['sign', 'verify']);
}

async function signature(key, message) {
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))));
}

async function verifySignature(key, message, received) {
  if (!key || !RANDOM_VALUE.test(received)) return false;
  const bytes = Uint8Array.from(atob(received.replace(/-/g, '+').replace(/_/g, '/') + '='), char => char.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(message));
}

function checkoutMessage(sessionId, nonce) {
  return `${PACK}:checkout:${sessionId}:${nonce}`;
}

async function readCheckoutProof(request, key, id) {
  const parts = cookieValue(request, checkoutCookie(id)).split('.');
  if (parts.length !== 2) return null;
  const [nonce, proof] = parts;
  if (!RANDOM_VALUE.test(nonce) || !await verifySignature(key, checkoutMessage(id, nonce), proof)) return null;
  return nonce;
}

async function readReceipt(request, key) {
  const parts = cookieValue(request, RECEIPT).split('.');
  if (parts.length !== 3) return null;
  const [issuedAt, nonce, proof] = parts;
  if (!/^\d{1,12}$/.test(issuedAt) || !RANDOM_VALUE.test(nonce)) return null;
  if (!await verifySignature(key, `${PACK}:receipt:${issuedAt}:${nonce}`, proof)) return null;
  return { issuedAt: Number(issuedAt), nonce };
}

async function issueReceipt(key, nonce = randomValue()) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const proof = await signature(key, `${PACK}:receipt:${issuedAt}:${nonce}`);
  return cookie(RECEIPT, `${issuedAt}.${nonce}.${proof}`, RECEIPT_AGE);
}

function responseHeaders() {
  return new Headers({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  });
}

function json(body, status = 200, cookies = [], method = null) {
  const headers = responseHeaders();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (method) headers.set('Allow', method);
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(JSON.stringify(body), { status, headers });
}

function challengeQuery(url) {
  const date = url.searchParams.get('challenge');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const time = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date
    ? '&challenge=' + date
    : '';
}

function redirect(config, requestUrl, result, cookies = []) {
  const headers = responseHeaders();
  headers.set('Location', `${config.origin}/?supporter=${result}${challengeQuery(requestUrl)}`);
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}

async function stripe(config, path, body, idempotencyKey) {
  const headers = {
    Authorization: 'Bearer ' + config.stripeKey,
    'Stripe-Version': '2025-02-24.acacia'
  };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions' + path, {
    method: body ? 'POST' : 'GET',
    headers,
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) return null;
  return response.json();
}

function hostedCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://checkout.stripe.com' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

async function startCheckout(request, requestUrl, config, key) {
  if (request.headers.get('Origin') !== config.origin ||
    (request.headers.has('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) {
    return json({ error: 'forbidden' }, 403);
  }
  if (await readReceipt(request, key)) return json({ error: 'already_owned', owned: true }, 409);
  if (!config.enabled) return json({ error: 'checkout_unavailable' }, 503);

  const nonce = randomValue();
  const day = challengeQuery(requestUrl);
  const body = new URLSearchParams({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    'adaptive_pricing[enabled]': 'false',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(AMOUNT),
    'line_items[0][price_data][product_data][name]': 'Rage Bait Supporter Pack',
    'metadata[pack]': PACK,
    client_reference_id: nonce,
    expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
    success_url: `${config.origin}/api/supporter/return?session_id={CHECKOUT_SESSION_ID}${day}`,
    cancel_url: `${config.origin}/?supporter=canceled${day}`
  });
  try {
    const checkout = await stripe(config, '', body, PACK + ':' + nonce);
    const checkoutUrl = hostedCheckoutUrl(checkout?.url);
    if (!checkoutUrl || !SESSION_ID.test(checkout?.id || '') || checkout?.livemode !== config.livemode) {
      return json({ error: 'checkout_unavailable' }, 502);
    }
    const proof = await signature(key, checkoutMessage(checkout.id, nonce));
    return json({ url: checkoutUrl }, 200, [cookie(checkoutCookie(checkout.id), nonce + '.' + proof, CHECKOUT_AGE)]);
  } catch {
    return json({ error: 'checkout_unavailable' }, 502);
  }
}

async function checkoutState(request, config, key, id) {
  const nonce = await readCheckoutProof(request, key, id);
  if (!nonce) return null;
  const session = await stripe(config, '/' + id);
  if (!session || session.id !== id || session.mode !== 'payment' || session.livemode !== config.livemode ||
    session.currency !== CURRENCY || session.amount_total !== AMOUNT || session.metadata?.pack !== PACK ||
    session.client_reference_id !== nonce) return null;
  if (session.status === 'complete' && session.payment_status === 'paid') return 'paid';
  return session.status === 'expired' ? 'expired' : 'pending';
}

async function returnFromCheckout(request, requestUrl, config, key) {
  if (await readReceipt(request, key)) return redirect(config, requestUrl, 'success');
  const id = requestUrl.searchParams.get('session_id') || '';
  if (!config.enabled || !SESSION_ID.test(id)) return redirect(config, requestUrl, 'unavailable');
  const stateName = checkoutCookie(id);
  try {
    const state = await checkoutState(request, config, key, id);
    if (state === 'pending') return redirect(config, requestUrl, 'pending');
    if (state === 'expired') return redirect(config, requestUrl, 'unavailable', [cookie(stateName, '', 0)]);
    if (state !== 'paid') return redirect(config, requestUrl, 'unavailable');
    return redirect(config, requestUrl, 'success', [
      await issueReceipt(key),
      cookie(stateName, '', 0)
    ]);
  } catch {
    return redirect(config, requestUrl, 'unavailable');
  }
}

async function checkPendingPurchases(request, config, key) {
  const ids = (request.headers.get('Cookie') || '').split(';').map(part => part.trim().split('=')[0])
    .filter(name => name.startsWith(CHECKOUT_COOKIE_PREFIX)).map(name => name.slice(CHECKOUT_COOKIE_PREFIX.length))
    .filter(id => SESSION_ID.test(id)).slice(-3);
  const checks = await Promise.all(ids.map(async id => {
    try { return { id, state: await checkoutState(request, config, key, id) }; }
    catch { return { id, state: null }; }
  }));
  const cookies = checks.filter(({ state }) => state === 'paid' || state === 'expired')
    .map(({ id }) => cookie(checkoutCookie(id), '', 0));
  const owned = checks.some(({ state }) => state === 'paid');
  if (owned) cookies.push(await issueReceipt(key));
  return { owned, cookies };
}

export async function handleSupporter(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const routes = { '/api/supporter/status': 'GET', '/api/supporter/checkout': 'POST', '/api/supporter/return': 'GET' };
  if (!Object.hasOwn(routes, path)) return json({ error: 'not_found' }, 404);
  const config = configuration(url, env);
  if (!config.trusted) return json({ error: 'untrusted_origin' }, 403);
  if (request.method !== routes[path]) return json({ error: 'method_not_allowed' }, 405, [], routes[path]);

  const key = await importSigningKey(config.signingKey);
  if (path === '/api/supporter/checkout') return startCheckout(request, url, config, key);
  if (path === '/api/supporter/return') return returnFromCheckout(request, url, config, key);

  const receipt = await readReceipt(request, key);
  const cookies = receipt && Math.floor(Date.now() / 1000) - receipt.issuedAt >= RECEIPT_RENEWAL
    ? [await issueReceipt(key, receipt.nonce)]
    : [];
  if (!receipt && config.enabled) {
    const pending = await checkPendingPurchases(request, config, key);
    return json({ enabled: true, owned: pending.owned, amount: AMOUNT, currency: 'GBP' }, 200, pending.cookies);
  }
  return json({ enabled: config.enabled, owned: Boolean(receipt), amount: AMOUNT, currency: 'GBP' }, 200, cookies);
}
