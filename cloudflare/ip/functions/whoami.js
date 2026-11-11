/* Cloudflare Pages Function: GET /whoami
 *
 * The Cloudflare twin of hosting/edge/ip-whoami.js (the CloudFront Function
 * that answers /ip/whoami on AWS). Same contract, same allowlist, so the page
 * cannot tell which host it is on:
 *
 *   curl-ish client (Accept does not mention json) -> text/plain, the
 *                                                     address, newline
 *   the page (Accept: application/json)            -> a small JSON object
 *
 * Never cached (the answer differs per visitor), never stored, and no
 * access-control-allow-origin: it answers the page that asked and nobody
 * else's page. Keep the two files in step if the contract changes.
 */

/* Request headers echoed back to the visitor who sent them. Nothing is
 * derived, nothing is guessed: a header that was not received does not
 * appear, which is what lets the page say "this reached the edge". Cloudflare
 * adds headers of its own (cf-ipcountry and friends); they are deliberately
 * not on this list, because the visitor did not send them. */
const ECHO = [
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'dnt',
  'sec-gpc',
  'upgrade-insecure-requests',
];

/* Same sanitising as the CloudFront version: printable ASCII only, capped. */
function clean(s) {
  let out = '';
  for (const c of String(s)) {
    const code = c.charCodeAt(0);
    out += code < 0x20 || code > 0x7e ? ' ' : c;
  }
  return out.length > 400 ? out.substring(0, 400) : out;
}

const COMMON = {
  'cache-control': 'no-store, private',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

export function onRequestGet({ request }) {
  const h = request.headers;
  const ip = h.get('cf-connecting-ip') || '';
  const accept = (h.get('accept') || '').toLowerCase();

  if (!accept.includes('application/json')) {
    return new Response(ip + '\n', {
      headers: { ...COMMON, 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const headers = {};
  for (const name of ECHO) {
    const v = h.get(name);
    if (v) headers[name] = clean(v);
  }
  const body = JSON.stringify({
    ip: clean(ip),
    headers,
    note: 'Seen for this response. Not kept.',
  });
  return new Response(body, {
    headers: { ...COMMON, 'content-type': 'application/json; charset=utf-8' },
  });
}
