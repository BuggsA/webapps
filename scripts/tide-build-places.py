"""Build the tide place pages: apps/tide/tide-times/<place>/index.html,
the index at apps/tide/tide-times/index.html, and apps/tide/sitemap.xml.

    python scripts/tide-fetch-places.py 2027    # NOAA data -> scripts/.tide-places-cache
    python scripts/tide-build-places.py 2027    # cache -> pages

Owner, 2026-11-12: "should there be lots of pages ... well made descriptions
with information that is not all the same copy and paste?" - so every
sentence on a place page is built from that place's own NOAA numbers, and a
fact a station has no data for is left out rather than filled with words.
Google treats near-identical pages made in bulk as spam; the defence is not
rewording, it is that no two places have the same tide.

What each page states, and where it comes from (all NOAA CO-OPS):
  - the pattern (twice-daily / mixed / once-daily): the form number
    (K1+O1)/(M2+S2) from the station's harmonic constants. NOAA's own
    `tideType` field is NOT used: it calls Boston "Mixed".
  - typical ranges: the tidal datums MN, GT, DHQ, DLQ.
  - when high water comes after the moon: M2 local epoch / 28.984 deg/h,
    shown only where the tide is mainly twice-daily (form number < 1.5).
    Checked: Boston gives 11 h 11 min, the classic establishment.
  - the year's highest and lowest tides: NOAA's official high/low
    predictions for the whole year - read, never computed.
  - records: the datums' observed max/min water level, and HAT/LAT.
  - nearby: the other pages, by great-circle distance.
The live week at the top is filled in the browser by tide-times/place.js.
"""
import datetime, hashlib, html, json, math, os, re, subprocess, sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.tide-places-cache')
APP = os.path.join(ROOT, 'apps', 'tide')
OUT = os.path.join(APP, 'tide-times')
SITE = 'https://tidehere.app'
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today().year + 1
TODAY = datetime.date.today().isoformat()
M2FT = 3.28084

REGIONS = {
    'AK': 'Alaska', 'AL': 'Alabama', 'CA': 'California', 'CT': 'Connecticut', 'DC': 'Washington, DC',
    'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'LA': 'Louisiana',
    'MA': 'Massachusetts', 'MD': 'Maryland', 'ME': 'Maine', 'MS': 'Mississippi', 'NC': 'North Carolina',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NY': 'New York', 'OR': 'Oregon', 'PA': 'Pennsylvania',
    'PR': 'Puerto Rico', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'TX': 'Texas', 'VA': 'Virginia',
    'VI': 'U.S. Virgin Islands', 'WA': 'Washington', 'American Samoa': 'American Samoa', 'Bermuda': 'Bermuda',
}
GULF = {'TX', 'LA', 'MS', 'AL'}
# Zones by NOAA's (timezonecorr, observedst); the few that do not follow
# from those are named per station.
ZONES = {(-5, True): 'America/New_York', (-6, True): 'America/Chicago', (-8, True): 'America/Los_Angeles',
         (-9, True): 'America/Anchorage', (-10, True): 'America/Adak', (-10, False): 'Pacific/Honolulu',
         (-4, False): 'America/Puerto_Rico', (-4, True): 'Atlantic/Bermuda', (-11, False): 'Pacific/Pago_Pago'}
BY_ID = {'1619910': ('Pacific/Midway', 'Midway Atoll'), '1630000': ('Pacific/Guam', 'Guam'),
         '1631428': ('Pacific/Guam', 'Guam'), '1820000': ('Pacific/Kwajalein', 'Marshall Islands'),
         '1890000': ('Pacific/Wake', 'Wake Island')}

# Stations under 2.5 mi from another give near-identical pages - the very
# thing that gets a site's pages treated as bulk duplicates. One of each such
# pair is dropped: the one whose name fewer people would search for.
# load() prints any new pair this close, so the list stays honest.
DROP = {
    '2695535': 'Bermuda Biological Station - 0.5 mi from St. Georges Island',
    '8551910': 'Reedy Point - 1.9 mi from Delaware City',
    '8775241': 'Aransas, Aransas Pass - 2.1 mi from Port Aransas',
    '8779749': 'SPI Brazos Santiago - 0.9 mi from South Padre Island CG Station',
}


def esc(s):
    return html.escape(str(s), quote=True)


def slugify(s):
    s = s.lower().replace('&', ' and ').replace("'", '').replace('.', '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def fft(v, signed=False):
    s = f'{v:.1f}'.replace('-0.0', '0.0')
    if signed and v > 0:
        s = '+' + s
    return s + ' ft'


def fm(v):
    return f'{v / M2FT:.2f} m'


def both(v):
    return f'<span class="n">{fft(v)}</span> <span class="n" style="color:var(--chrome-soft)">({fm(v)})</span>'


def hm(hours):
    m = int(round(hours * 60))
    return f'{m // 60} h {m % 60:02d} min'


def ymd(s):
    s = s.replace('-', '')[:8]
    return datetime.date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def date_long(d):
    return f'{d.strftime("%b")} {d.day}, {d.year}'


def date_wd(d):
    return f'{d.strftime("%a")}, {d.strftime("%b")} {d.day}'


def clock(hhmm):
    h, m = int(hhmm[:2]), int(hhmm[3:5])
    return f'{(h % 12) or 12}:{m:02d} {"am" if h < 12 else "pm"}'


def dist(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a['lat'], a['lon'], b['lat'], b['lon']))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    km = 2 * 6371 * math.asin(math.sqrt(h))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    brg = (math.degrees(math.atan2(y, x)) + 360) % 360
    return km * 0.621371, ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][int((brg + 22.5) // 45) % 8]


def vhash(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:10]


def sun_up(p, r):
    """Is the sun above the horizon at this place at the row's local time?
    NOAA's low-precision solar position (good to a minute or two of sunrise)
    - a fixed clock window called a 5:49 pm January low in Boston "daylight"."""
    h, m = int(r['time'][:2]), int(r['time'][3:5])
    loc = datetime.datetime(r['date'].year, r['date'].month, r['date'].day, h, m, tzinfo=ZoneInfo(p['tz']))
    u = loc.astimezone(datetime.timezone.utc)
    doy = u.timetuple().tm_yday
    g = 2 * math.pi / 365 * (doy - 1 + (u.hour - 12) / 24)
    eqt = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                    - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    dec = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
           + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    tst = u.hour * 60 + u.minute + eqt + 4 * p['lon']
    ha = math.radians(tst / 4 - 180)
    lat = math.radians(p['lat'])
    alt = math.degrees(math.asin(math.sin(lat) * math.sin(dec) + math.cos(lat) * math.cos(dec) * math.cos(ha)))
    return alt > -0.833


def spaced(rows, key, n=3, days=5):
    """The n most extreme rows by key, at least `days` apart (one per spring tide)."""
    out = []
    for r in sorted(rows, key=key):
        d = r['date']
        if all(abs((d - o['date']).days) >= days for o in out):
            out.append(r)
        if len(out) == n:
            break
    return out


def engine_names():
    js = "process.stdout.write(JSON.stringify(require('./apps/tide/lib/harmonics.js').NAMES))"
    return set(json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT)))


def load():
    names = engine_names()
    places = []
    for sid in sorted(os.listdir(CACHE)):
        d = os.path.join(CACHE, sid)
        if not os.path.isdir(d) or sid in DROP:
            continue
        try:
            st = json.load(open(os.path.join(d, 'station.json')))
            dm = json.load(open(os.path.join(d, 'datums.json')))
            hc = json.load(open(os.path.join(d, 'harcon.json')))
            hl = json.load(open(os.path.join(d, f'hilo-{YEAR}.json')))
        except (OSError, ValueError):
            continue
        dat = {x['name']: x['value'] for x in (dm.get('datums') or []) if x.get('value') is not None}
        cons = [c for c in (hc.get('HarmonicConstituents') or []) if c.get('amplitude', 0) > 0]
        preds = hl.get('predictions') or []
        if 'MLLW' not in dat or 'MSL' not in dat or not cons or not preds:
            continue
        amp = {c['name']: c['amplitude'] for c in cons}
        if not all(k in amp for k in ('M2', 'K1', 'O1')):
            continue
        tz, region = BY_ID.get(sid, (None, None))
        tz = tz or ZONES.get((st.get('timezonecorr'), bool(st.get('observedst'))))
        region = region or REGIONS.get(st['state'])
        if not tz or not region:
            print('skip (zone/region)', sid, st['name'], st['state'])
            continue
        rows = []
        for p in preds:
            dt = p['t']
            rows.append({'date': ymd(dt[:10]), 'time': dt[11:16], 'v': float(p['v']), 'type': p['type']})
        places.append({
            'id': sid, 'name': st['name'].strip(), 'state': st['state'], 'region': region,
            'lat': float(st['lat']), 'lon': float(st['lng']), 'tz': tz,
            'dat': dat, 'meta': dm, 'cons': cons, 'amp': amp, 'rows': rows,
            'engine': [[c['name'], round(c['amplitude'] * M2FT, 4), c['phase_GMT']] for c in cons if c['name'] in names],
        })
    for i, a in enumerate(places):
        for b in places[i + 1:]:
            if dist(a, b)[0] < 2.5:
                print('WARNING: near-duplicate pages, add one to DROP:', a['id'], a['name'], '/', b['id'], b['name'])
    # slugs: name + state code (or region) - unique by construction, checked
    for p in places:
        tail = p['state'] if len(p['state']) == 2 else p['region']
        base = slugify(p['name'])
        t = slugify(tail)
        p['slug'] = base if base.endswith('-' + t) or base == t else base + '-' + t
    seen = {}
    for p in places:
        if p['slug'] in seen:
            p['slug'] += '-' + p['id']
        seen[p['slug']] = p
    return places


def facts(p, all_places):
    dat, a = p['dat'], p['amp']
    mllw = dat['MLLW']
    F = (a.get('K1', 0) + a.get('O1', 0)) / (a.get('M2', 0) + a.get('S2', 0))
    p['F'] = F
    out = []

    # -- pattern
    dhq, dlq = dat.get('DHQ'), dat.get('DLQ')
    if F < 0.25:
        kind, text = 'twice-daily', 'Two high tides and two low tides a day, about 12 h 25 min apart.'
        if dhq:
            text += f' The two highs are close: on average just {fft(2 * dhq * M2FT)} apart.'
    elif F < 1.5:
        kind = 'mixed, mainly twice-daily'
        text = 'Two highs and two lows on most days, but unequal ones.'
        if dhq and dlq:
            text += (f' On average the higher high stands {fft(2 * dhq * M2FT)} above the lower high, and the lower '
                     f'low sits {fft(2 * dlq * M2FT)} below the higher low.')
    elif F < 3:
        kind, text = 'mixed, mainly once-daily', ('Mostly one large high and one large low a day; on some days a '
                                                  'small second high and low appear between them.')
    else:
        kind = 'once-daily'
        text = 'Usually just one high tide and one low tide a day, about 24 h 50 min apart'
        text += ' - the pattern of most of the Gulf of Mexico.' if p['state'] in GULF else '.'
    p['kind'] = kind
    out.append(('Pattern', f'<span class="big">{kind[0].upper() + kind[1:]}</span><br>{text} '
                f'<span style="color:var(--chrome-soft)">Form number {F:.2f}.</span>'))

    # -- range
    gt, mn = dat.get('GT'), dat.get('MN')
    if gt:
        gts = sorted(x['dat']['GT'] for x in all_places if x['dat'].get('GT'))
        pct = round(100 * sum(1 for g in gts if g < gt) / len(gts))
        if pct >= 50:
            rank = f'a bigger range than {pct}% of the {len(gts)} places on this site'
        else:
            rank = f'a smaller range than {100 - pct}% of the {len(gts)} places on this site'
        line = f'<span class="big">{fft(gt * M2FT)}</span> from the higher high to the lower low on an average day ({fm(gt * M2FT)}) - {rank}.'
        if mn and F >= 0.25:
            line += f' The mean range, high to low, is {fft(mn * M2FT)}.'
        out.append(('Typical range', line))
        p['gt_ft'] = gt * M2FT

    # -- the moon's clock
    m2 = next((c for c in p['cons'] if c['name'] == 'M2'), None)
    if m2 and F < 1.5 and m2.get('phase_local') is not None:
        hwi = (m2['phase_local'] / 28.984104) % 12.4206
        out.append(('After the moon', f'High water comes about <span class="big">{hm(hwi)}</span> after the moon is '
                    'highest in the sky.'))

    return out


def year_tables(p):
    rows = p['rows']
    highs = [r for r in rows if r['type'] == 'H']
    lows = [r for r in rows if r['type'] == 'L']
    top = spaced(highs, key=lambda r: -r['v'])
    bot = spaced(lows, key=lambda r: r['v'])
    p['king'] = top
    neg = sum(1 for r in lows if r['v'] < 0)
    day = [r for r in lows if sun_up(p, r)]
    dbot = spaced(day, key=lambda r: r['v'])

    def tr(r, note=''):
        return (f'<tr><td>{date_wd(r["date"])}</td><td class="n">{clock(r["time"])}</td>'
                f'<td class="n">{fft(r["v"])}</td><td class="note">{note}</td></tr>')

    def daynote(r):
        return 'in daylight' if sun_up(p, r) else 'in the dark'

    h = [f'<table class="year"><caption>The highest tides of {YEAR} - the king tides</caption>'
         + ''.join(tr(r) for r in top) + '</table>',
         f'<table class="year"><caption>The lowest tides of {YEAR}</caption>'
         + ''.join(tr(r, daynote(r)) for r in bot) + '</table>']
    if dbot and any(r not in bot for r in dbot):
        h.append(f'<table class="year"><caption>The lowest tides of {YEAR} in daylight - for tide pools</caption>'
                 + ''.join(tr(r) for r in dbot) + '</table>')
    if neg:
        h.append(f'<p>{neg} low tide{"s" if neg != 1 else ""} in {YEAR} drop below zero - below the average lower '
                 'low water - and uncover more shore than usual.</p>')
    else:
        h.append(f'<p>No low tide in {YEAR} drops below zero (the average lower low water).</p>')
    return '\n'.join(h)


def records(p):
    m, dat = p['meta'], p['dat']
    mllw = dat['MLLW']
    out = []
    try:
        if m.get('max') is not None and m.get('maxdate'):
            v = (float(m['max']) - mllw) * M2FT
            extra = ''
            if dat.get('MHHW'):
                extra = f' - {fft(v - (dat["MHHW"] - mllw) * M2FT)} above the average higher high'
            out.append(('Highest water recorded', f'{both(v)} on {date_long(ymd(m["maxdate"]))}{extra}.'))
        if m.get('min') is not None and m.get('mindate'):
            v = (float(m['min']) - mllw) * M2FT
            out.append(('Lowest water recorded', f'{both(v)} on {date_long(ymd(m["mindate"]))}.'))
        if m.get('HAT') is not None and m.get('HATdate'):
            d = ymd(m['HATdate'])
            verb = 'falls' if d >= datetime.date.today() else 'fell'
            out.append(('Highest tide the moon and sun can raise',
                        f'{both((float(m["HAT"]) - mllw) * M2FT)} - the highest astronomical tide in NOAA’s 19-year '
                        f'cycle, which {verb} on {date_long(d)}.'))
    except (ValueError, TypeError):
        pass
    return out


def dl(items):
    return '<dl class="facts">' + ''.join(f'<div><dt>{esc(k)}</dt><dd>{v}</dd></div>' for k, v in items) + '</dl>'


def page(p, places, v):
    near = sorted((dist(p, q) + (q,) for q in places if q is not p), key=lambda x: x[0])[:5]
    near = [n for n in near if n[0] < 400]
    fx = facts(p, places)
    yt = year_tables(p)
    rec = records(p)
    title_place = f'{p["name"]}, {p["state"] if len(p["state"]) == 2 else p["region"]}'
    title = f'{title_place} tide times: today’s high & low tides | tidehere'
    king = p['king']
    desc = (f'High and low tide times for {p["name"]}, {p["region"]}, from NOAA station {p["id"]}. '
            f'{p["kind"][0].upper() + p["kind"][1:]} tides'
            + (f', {fft(p["gt_ft"])} on an average day' if p.get('gt_ft') else '')
            + (f'. Biggest tides of {YEAR}: {king[0]["date"].strftime("%b")} {king[0]["date"].day}' if king else '')
            + (f' and {king[1]["date"].strftime("%b")} {king[1]["date"].day}.' if len(king) > 1 else '.'))
    url = f'{SITE}/tide-times/{p["slug"]}/'
    station = {'id': p['id'], 'name': p['name'], 'tz': p['tz'],
               'off': round((p['dat']['MSL'] - p['dat']['MLLW']) * M2FT, 4), 'cons': p['engine']}
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', '@id': url, 'url': url, 'name': f'{title_place} tide times',
         'description': desc, 'inLanguage': 'en', 'isPartOf': {'@id': SITE + '/#site'},
         'about': {'@type': 'Place', 'name': p['name'], 'address': {'@type': 'PostalAddress', 'addressRegion': p['region'], 'addressCountry': 'BM' if p['region'] == 'Bermuda' else 'US'},
                   'geo': {'@type': 'GeoCoordinates', 'latitude': p['lat'], 'longitude': p['lon']}}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Tide', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Tide times', 'item': SITE + '/tide-times/'},
            {'@type': 'ListItem', 'position': 3, 'name': p['name'], 'item': url}]}]}
    near_html = ''
    if near:
        near_html = (f'<h2>Tide times nearby</h2><ul class="places">' + ''.join(
            f'<li><a href="/tide-times/{q["slug"]}/">{esc(q["name"])}</a><span class="d">{mi:.0f} mi {d}</span></li>'
            for mi, d, q in near) + '</ul>')
    rid = slugify(p['region'])
    return f'''<!DOCTYPE html>
<!-- Built by scripts/tide-build-places.py from NOAA data - edit the script, not this file. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0a1220">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="tidehere">
<meta property="og:title" content="{esc(title_place)} tide times">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/share.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/fraunces-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/tide-times/place.css?v={v['css']}">
<script type="application/ld+json">{json.dumps(ld, separators=(',', ':'))}</script>
</head>
<body>
<main class="page">
<p class="crumbs"><a href="/">Tide</a><span aria-hidden="true">/</span><a href="/tide-times/">Tide times</a><span aria-hidden="true">/</span><a href="/tide-times/#{rid}">{esc(p['region'])}</a></p>
<h1>{esc(p['name'])} tide times</h1>
<p class="sub">{esc(p['region'])} &middot; NOAA station <span class="n">{p['id']}</span> &middot; <span class="n">{abs(p['lat']):.3f}&deg;{'N' if p['lat'] >= 0 else 'S'} {abs(p['lon']):.3f}&deg;{'E' if p['lon'] >= 0 else 'W'}</span></p>

<section class="now" aria-labelledby="h-now">
<h2 id="h-now" class="visually-hidden">High and low tides this week</h2>
<p class="now-state" id="now-state" aria-live="polite">Loading the tide&hellip;</p>
<p class="now-src" id="now-src"></p>
<table class="week" id="week"></table>
<noscript><p>The week&rsquo;s tide times need JavaScript. NOAA&rsquo;s official table for this station:
<a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id={p['id']}">tidesandcurrents.noaa.gov</a>.</p></noscript>
</section>

<h2>The tide at {esc(p['name'])}</h2>
{dl(fx)}

<h2>{YEAR}: the biggest and smallest tides</h2>
{yt}

{('<h2>Records</h2>' + dl(rec)) if rec else ''}

{near_html}

<p class="globe-link"><a href="/">See the moon move the ocean</a> - the same tide, on a globe seen from the moon.</p>
<p class="fine">Heights are above mean lower low water (MLLW), the zero of US charts; times are local.
The year&rsquo;s tides are NOAA&rsquo;s official predictions - wind and air pressure can move the real water a foot or more.
Form number: (K1+O1)/(M2+S2) from NOAA&rsquo;s harmonic constants - below 0.25 twice-daily, above 3 once-daily.
Predictions and records: NOAA CO-OPS, station <a href="https://tidesandcurrents.noaa.gov/stationhome.html?id={p['id']}">{p['id']}</a>.
<strong>Not for navigation or safety.</strong> For a boat, a crossing of sand that floods, or a swim, use the official
tables and local advice. No ads, no tracking.</p>
</main>
<script type="application/json" id="station">{json.dumps(station, separators=(',', ':'))}</script>
<script src="/lib/harmonics.js?v={v['harm']}"></script>
<script src="/tide-times/place.js?v={v['js']}"></script>
</body>
</html>
'''


def index(places, v):
    by = {}
    for p in places:
        by.setdefault(p['region'], []).append(p)
    regions = sorted(by)
    url = SITE + '/tide-times/'
    sec = []
    for r in regions:
        items = ''.join(
            f'<li><a href="/tide-times/{p["slug"]}/">{esc(p["name"])}</a>'
            f'<span class="d">{fft(p["gt_ft"]) if p.get("gt_ft") else ""}</span></li>'
            for p in sorted(by[r], key=lambda p: p['name']))
        sec.append(f'<h2 id="{slugify(r)}">{esc(r)}</h2><ul class="places">{items}</ul>')
    toc = ''.join(f'<li><a href="#{slugify(r)}">{esc(r)}</a> <span class="n" style="color:var(--chrome-faint)">{len(by[r])}</span></li>' for r in regions)
    biggest = max(places, key=lambda p: p.get('gt_ft', 0))
    title = f'Tide times for {len(places)} NOAA tide stations: high & low tides by place | tidehere'
    desc = (f'High and low tide times for {len(places)} NOAA tide stations across {len(regions)} US states and territories, '
            f'with each place’s pattern, range and the biggest tides of {YEAR}.')
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', '@id': url, 'url': url, 'name': 'Tide times by place', 'description': desc,
         'isPartOf': {'@id': SITE + '/#site'}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Tide', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Tide times', 'item': url}]}]}
    return f'''<!DOCTYPE html>
<!-- Built by scripts/tide-build-places.py - edit the script, not this file. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0a1220">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="tidehere">
<meta property="og:title" content="Tide times by place">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/share.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/tide-times/place.css?v={v['css']}">
<script type="application/ld+json">{json.dumps(ld, separators=(',', ':'))}</script>
</head>
<body>
<main class="page">
<p class="crumbs"><a href="/">Tide</a><span aria-hidden="true">/</span>Tide times</p>
<h1>Tide times by place</h1>
<p class="sub">{len(places)} NOAA tide stations. Each page has the week&rsquo;s high and low tides, live from NOAA,
and what makes that coast&rsquo;s tide its own - its pattern, its range, and the biggest tides of {YEAR}.
The number beside each place is its range on an average day; the largest here is
<a href="/tide-times/{biggest['slug']}/">{esc(biggest['name'])}</a>, {fft(biggest['gt_ft'])}.</p>
<ul class="states">{toc}</ul>
{''.join(sec)}
<p class="globe-link"><a href="/">See the moon move the ocean</a> - and find the tide for any coast in the world.</p>
<p class="fine">Data: NOAA CO-OPS. <strong>Not for navigation or safety.</strong></p>
</main>
</body>
</html>
'''


def sitemap(places):
    urls = [SITE + '/', SITE + '/tide-times/'] + [f'{SITE}/tide-times/{p["slug"]}/' for p in sorted(places, key=lambda p: p['slug'])]
    body = ''.join(f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n  </url>\n' for u in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'


def main():
    places = load()
    v = {'css': vhash(os.path.join(OUT, 'place.css')), 'js': vhash(os.path.join(OUT, 'place.js')),
         'harm': vhash(os.path.join(APP, 'lib', 'harmonics.js'))}
    keep = {'place.css', 'place.js', 'index.html'}
    live = {p['slug'] for p in places}
    for name in os.listdir(OUT):   # drop pages for stations that have gone
        if name not in keep and name not in live and os.path.isdir(os.path.join(OUT, name)):
            import shutil
            shutil.rmtree(os.path.join(OUT, name))
    for p in places:
        os.makedirs(os.path.join(OUT, p['slug']), exist_ok=True)
        with open(os.path.join(OUT, p['slug'], 'index.html'), 'w') as f:
            f.write(page(p, places, v))
    with open(os.path.join(OUT, 'index.html'), 'w') as f:
        f.write(index(places, v))
    with open(os.path.join(APP, 'sitemap.xml'), 'w') as f:
        f.write(sitemap(places))
    print(len(places), 'place pages,', len({p['region'] for p in places}), 'regions; sitemap', len(places) + 2, 'URLs')


main()
