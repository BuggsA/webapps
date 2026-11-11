#!/usr/bin/env python3
"""Write the registry numbers into the doors. One command:

    python scripts/ip-build-door-stats.py

Owner, 2026-11-11: "for backlinks and seo can you make CIDR calculator and
'IPv4 vs IPv6'." What people link to and quote is original data - a number
nobody else's page has, with a date and a source. This site already ships
one: apps/ip/data/space.bin, every allocation the five regional registries
have made (NRO delegated statistics, built by ip-build-space-field.py).

So the numbers on /ipv4-vs-ipv6/ are DERIVED here from that file and
written between the markers

    <!-- stats:begin -->  ...  <!-- stats:end -->

never typed by hand (PRODUCT_SOUL.md 8.12: anything that states the state is
derived from what exists). Rebuild space.bin, rerun this, and the page,
its dates and its claims move together. Exit status is non-zero if the
markers are missing.
"""

import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SPACE = os.path.join(ROOT, 'apps', 'ip', 'data', 'space.bin')
PAGE = os.path.join(ROOT, 'apps', 'ip', 'ipv4-vs-ipv6', 'index.html')
RIR = ['AFRINIC', 'APNIC', 'ARIN', 'LACNIC', 'RIPE NCC', 'IANA']
BEGIN, END = '<!-- stats:begin -->', '<!-- stats:end -->'
# Names for the countries that can lead the table. A code not here is
# printed as its code, which is still true, just less friendly.
NAMES = {'US': 'the United States', 'CN': 'China', 'JP': 'Japan', 'GB': 'the United Kingdom',
         'DE': 'Germany', 'KR': 'South Korea', 'BR': 'Brazil', 'FR': 'France', 'CA': 'Canada',
         'IT': 'Italy', 'NL': 'the Netherlands', 'AU': 'Australia', 'IN': 'India', 'RU': 'Russia',
         'TW': 'Taiwan', 'ES': 'Spain', 'MX': 'Mexico', 'SE': 'Sweden'}
NOT_COUNTRIES = {'EU', 'AP', 'ZZ', '  ', ''}


def read_space(path):
    b = open(path, 'rb').read()
    assert b[:4] == b'IPSF' and b[4] == 1, 'not a version-1 space.bin'
    built = int.from_bytes(b[5:9], 'little')
    p = 9

    def v():
        nonlocal p
        shift = out = 0
        while True:
            byte = b[p]
            p += 1
            out |= (byte & 0x7f) << shift
            shift += 7
            if not byte & 0x80:
                return out

    keys = []
    for _ in range(v()):
        keys.append((b[p], b[p + 1:p + 3].decode('ascii'), b[p + 3] | (b[p + 4] << 8)))
        p += 5
    fams = []
    for _fam in (4, 6):
        n, at, out = v(), 0, []
        for _ in range(n):
            at += v()
            length = v()
            out.append((at, length, keys[v()]))
            at += length
        fams.append(out)
    return built, fams[0], fams[1]


def pct(x, of, places=1):
    return ('%.' + str(places) + 'f%%') % (100.0 * x / of)


def build(built, v4, v6):
    d = str(built)
    date = '%s-%s-%s' % (d[:4], d[4:6], d[6:])
    total4 = 1 << 32
    held4 = sum(n for _a, n, _k in v4)
    by_rir4 = {}
    by_era = {}
    by_cc = {}
    for _a, n, (rir, cc, year) in v4:
        by_rir4[rir] = by_rir4.get(rir, 0) + n
        era = ('before 1990' if year < 1990 else '1990s' if year < 2000 else
               '2000s' if year < 2010 else '2010s' if year < 2020 else '2020s')
        by_era[era] = by_era.get(era, 0) + n
        if cc.strip() not in NOT_COUNTRIES and cc.isalpha():
            by_cc[cc] = by_cc.get(cc, 0) + n
    unicast = 3758096384              # 0.0.0.0 - 223.255.255.255: everything but multicast and class E

    slash32 = 1 << 96                 # one /32 of IPv6, in addresses
    space3 = 1 << 125                 # 2000::/3, the part of IPv6 handed out at all
    held6 = sum(n for _a, n, _k in v6)
    by_rir6 = {}
    for _a, n, (rir, _cc, _y) in v6:
        by_rir6[rir] = by_rir6.get(rir, 0) + n

    rows4 = ''.join(
        '<tr><td>%s</td><td>%s addresses</td><td>%s</td></tr>' % (
            RIR[r], '{:,}'.format(by_rir4[r]), pct(by_rir4[r], held4))
        for r in sorted(by_rir4, key=lambda r: -by_rir4[r]))
    eras = ['before 1990', '1990s', '2000s', '2010s', '2020s']
    rows_era = ''.join(
        '<tr><td>%s</td><td>%s addresses</td><td>%s</td></tr>' % (
            e[0].upper() + e[1:], '{:,}'.format(by_era.get(e, 0)), pct(by_era.get(e, 0), held4))
        for e in eras if by_era.get(e))
    top = sorted(by_cc, key=lambda c: -by_cc[c])[:5]
    rows6 = ''.join(
        '<tr><td>%s</td><td>%s /32s</td><td>%s</td></tr>' % (
            RIR[r], '{:,}'.format(by_rir6[r] // slash32), pct(by_rir6[r], held6))
        for r in sorted(by_rir6, key=lambda r: -by_rir6[r]))

    frac6 = held6 / float(space3)
    return '\n'.join([
        BEGIN,
        '<!-- Written by scripts/ip-build-door-stats.py from data/space.bin. Do not edit by hand. -->',
        '<h2 id="by-the-numbers">By the numbers: what the registries have handed out</h2>',
        '<p>Computed from every allocation the five regional internet registries have published '
        '(NRO delegated statistics, snapshot of <time datetime="%s">%s</time>), the same records '
        'the <a href="/">map on the front page</a> is drawn from.</p>' % (date, date),
        '<table>',
        '<tr><td>IPv4 handed out</td><td>%s addresses: %s of all IPv4, and %s of everything '
        'below 224.0.0.0 - the rest of that is mostly private and reserved ranges no registry '
        'hands out. IPv4 is, for practical purposes, all spoken for.</td></tr>' % (
            '{:,}'.format(held4), pct(held4, total4), pct(held4, unicast)),
        '<tr><td>IPv6 handed out</td><td>%s blocks the size of a /32, about %s of the 2000::/3 '
        'range that all public IPv6 comes from. Put the other way: for every address handed out, '
        'about %s more are still waiting.</td></tr>' % (
            '{:,}'.format(held6 // slash32), ('%.4f%%' % (100 * frac6)),
            '{:,}'.format(int(round((1 - frac6) / frac6)))),
        '<tr><td>Countries holding IPv4</td><td>%d, led by %s.</td></tr>' % (
            len(by_cc), ', '.join('%s (%s)' % (NAMES.get(c, c), pct(by_cc[c], held4)) for c in top)),
        '</table>',
        '<h3>IPv4 by registry</h3>',
        '<table>' + rows4 + '</table>',
        '<h3>IPv4 by the decade it was handed out</h3>',
        '<table>' + rows_era + '</table>',
        '<h3>IPv6 by registry</h3>',
        '<table>' + rows6 + '</table>',
        '<p class="cite">Free to quote with a link to '
        '<a href="https://iphere.app/ipv4-vs-ipv6/#by-the-numbers">iphere.app/ipv4-vs-ipv6</a>. '
        'Source data: the Number Resource Organization.</p>',
        END,
    ]), date


def main():
    built, v4, v6 = read_space(SPACE)
    block, date = build(built, v4, v6)
    page = open(PAGE, encoding='utf-8').read()
    if BEGIN not in page or END not in page:
        print('markers not found in', PAGE)
        return 1
    a = page.index(BEGIN)
    z = page.index(END) + len(END)
    page = page[:a] + block + page[z:]
    open(PAGE, 'w', encoding='utf-8').write(page)
    print('wrote stats from space.bin built %s into %s' % (date, os.path.relpath(PAGE, ROOT)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
