/* CloudFront Function — viewer-request on /ip/whoami
 *
 * For apps/ip. The S3 bucket never sees the viewer's address; this does, at
 * the edge, and answers without ever touching the origin.
 *
 *   curl-ish client (Accept does not mention html or json) -> text/plain, the
 *                                                            address, newline
 *   the page (Accept: application/json)                    -> a small JSON
 *                                                            object
 *
 * Why this exists rather than a third-party echo: docs/ip-data-research.md
 * §4. Why not Lambda@Edge: a cold-start tail on the one thing that must
 * never feel slow.
 *
 * Constraints: CloudFront Functions source is capped at 10 KB, runs
 * JS 2.0 (no fetch, no network, sub-millisecond), and this behaviour must
 * have caching DISABLED — the response varies per viewer.
 *
 * Deliberately NOT sent: any `access-control-allow-origin`. This answers the
 * page that asked for it and nobody else's page.
 */

/* Request headers echoed back to the viewer who sent them. Nothing is
 * derived, nothing is guessed: a header that was not received does not
 * appear in the response, which is what lets the page say "this reached the
 * edge" without qualification. */
var ECHO = [
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
  'upgrade-insecure-requests'
];

function esc(s) {
  var out = '', i, c, code;
  for (i = 0; i < s.length; i++) {
    c = s.charAt(i);
    code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === '\\') out += '\\\\';
    else if (code < 0x20 || code > 0x7e) out += ' ';
    else out += c;
  }
  return out.length > 400 ? out.substring(0, 400) : out;
}

/* Place names may be non-ASCII (Zürich, São Paulo), so they are escaped as
 * \uXXXX rather than flattened to spaces like the echoed headers. CloudFront
 * may hand them over percent-encoded; decode that if it is well formed. */
function escPlace(s) {
  var out = '', i, c, code;
  if (s.indexOf('%') >= 0) { try { s = decodeURIComponent(s); } catch (e) {} }
  for (i = 0; i < s.length && i < 80; i++) {
    c = s.charAt(i);
    code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === '\\') out += '\\\\';
    else if (code < 0x20 || code === 0x7f) continue;
    else if (code > 0x7e) out += '\\u' + ('000' + code.toString(16)).slice(-4);
    else out += c;
  }
  return out;
}

/* Where the edge thinks this connection comes from (2026-11-11, owner's
 * request). CloudFront derives these headers itself from its own GeoIP data;
 * nobody else is asked. They only reach a viewer-request function because
 * the /ip/whoami behaviour's origin request policy lists them (see
 * hosting_stack.py). It is the location of the visitor's NETWORK, so the
 * page calls it approximate. A header that is absent is left out. */
var WHERE = [
  ['city', 'cloudfront-viewer-city'],
  ['region', 'cloudfront-viewer-country-region-name'],
  ['regionCode', 'cloudfront-viewer-country-region'],
  ['country', 'cloudfront-viewer-country']
];

function whereJson(headers) {
  var out = '', i, h, v;
  for (i = 0; i < WHERE.length; i++) {
    h = headers[WHERE[i][1]];
    v = (h && h.value) ? String(h.value) : '';
    if (!v) continue;
    out += (out ? ',' : '') + '"' + WHERE[i][0] + '":"' + escPlace(v) + '"';
  }
  return out ? '{' + out + '}' : 'null';
}

/* The network this connection arrives from. CloudFront gives the AS number
 * only (no name); the page fills the name in by that number, never by the
 * address. */
function netJson(headers) {
  var h = headers['cloudfront-viewer-asn'];
  var asn = (h && h.value) ? parseInt(h.value, 10) : 0;
  return asn > 0 ? '{"asn":' + asn + '}' : 'null';
}

function handler(event) {
  var req = event.request;
  var headers = req.headers || {};
  var ip = (event.viewer && event.viewer.ip) ? String(event.viewer.ip) : '';

  var accept = (headers.accept && headers.accept.value)
    ? headers.accept.value.toLowerCase() : '';
  var wantsJson = accept.indexOf('application/json') >= 0;
  var wantsHtml = accept.indexOf('text/html') >= 0;

  var common = {
    'cache-control': { value: 'no-store, private' },
    'x-content-type-options': { value: 'nosniff' },
    'referrer-policy': { value: 'no-referrer' }
  };

  /* Anything that is not a browser asking for JSON gets the plain answer and
   * nothing else. `curl https://…/ip/whoami` is a first-class client. */
  if (!wantsJson) {
    common['content-type'] = { value: 'text/plain; charset=utf-8' };
    return {
      statusCode: 200,
      statusDescription: 'OK',
      headers: common,
      body: ip + '\n'
    };
  }

  var body = '{"ip":"' + esc(ip) + '","where":' + whereJson(headers) +
    ',"net":' + netJson(headers) + ',"headers":{';
  var first = true, i, name, v;
  for (i = 0; i < ECHO.length; i++) {
    name = ECHO[i];
    if (!headers[name] || headers[name].value === undefined) continue;
    v = String(headers[name].value);
    if (v === '') continue;
    if (!first) body += ',';
    body += '"' + esc(name) + '":"' + esc(v) + '"';
    first = false;
  }
  body += '},"note":"Seen for this response. Not kept."}';

  common['content-type'] = { value: 'application/json; charset=utf-8' };
  return {
    statusCode: 200,
    statusDescription: 'OK',
    headers: common,
    body: body
  };
}
