#!/usr/bin/env python3
"""Pack the NRO delegated stats into the file apps/ip/ ships.

Phase A of docs/ip-plan-v2.md. This is what makes the map stop being empty:
every cell of every field can name its registry, its country and the year it
was handed out, with no lookup and nothing asked of anybody.

    python scripts/ip-build-space-field.py

Writes apps/ip/data/space.bin and prints what it cost.

Provenance: Number Resource Organization delegated statistics, the union of
what the five RIRs publish. Routing and delegation data by courtesy of the
RIPE NCC and the NRO. The file records the date it was built; the app shows
that date rather than implying the data is eternal.

FORMAT (little-endian, all integers LEB128 varints unless stated)

    magic     4 bytes  "IPSF"
    version   1 byte   1
    built     4 bytes  uint32, YYYYMMDD
    nkeys     varint   number of distinct (registry, country, year) triples
    keys      nkeys x  [ rir:1 byte | cc:2 bytes ascii | year:2 bytes uint16 ]
    n4        varint   IPv4 range count
    v4        n4 x     [ gap | length | key ]      gap from previous range end
    n6        varint   IPv6 range count
    v6        n6 x     [ gap | length | key ]      lengths are /128 counts

Ranges are sorted and non-overlapping, so a lookup is one binary search and
a field query is one linear pass. Adjacent ranges sharing a key are merged,
which is most of why this fits.

MEASURED 2026-09-17, so nobody re-derives it. Four cleverer encodings were
tried and all four lost to this one, because gzip's dictionary already
exploits the repetition better than a hand-rolled scheme can:

    first-seen keys, absolute payload   438,937   <- shipped
    grouped keys,    absolute payload   446,899
    frequency-ordered keys              444,720
    first-seen keys, delta payload      558,110
    grouped keys,    delta payload      550,031

The year is what costs. Coarser buckets shrink it, at the price of never
being able to say "allocated 1993" about anywhere:

    exact year        438,937   <- shipped
    2-year buckets    408,408
    5-year buckets    367,823
    five named eras   343,443
    no year at all    287,627

Exact years were kept. 96 KB buys a specific, surprising, per-place fact
about every block in the world, on a file that is deferred until the visitor
moves off Home, in a repo where Tide already ships a multi-megabyte binary
through the same pre-gzipped delivery path. To change it, bucket the year in
parse() -- one line -- and rebuild.
"""

import datetime
import gzip
import os
import sys
import urllib.request

SOURCE = "https://ftp.ripe.net/pub/stats/ripencc/nro-stats/latest/nro-delegated-stats"
RIRS = ["afrinic", "apnic", "arin", "lacnic", "ripencc", "iana"]
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, "apps", "ip", "data", "space.bin")
CACHE = os.path.join(HERE, ".nro-cache")


def fetch():
    """The source is ~57 MB. Cache it; this script gets re-run while tuning."""
    if os.path.exists(CACHE):
        age = (datetime.datetime.now()
               - datetime.datetime.fromtimestamp(os.path.getmtime(CACHE))).days
        if age < 7:
            print("using cached source (%d days old)" % age)
            return open(CACHE, "rb").read()
    print("fetching %s" % SOURCE)
    data = urllib.request.urlopen(SOURCE, timeout=180).read()
    open(CACHE, "wb").write(data)
    return data


def ip4(text):
    a, b, c, d = (int(x) for x in text.split("."))
    return (a << 24) | (b << 16) | (c << 8) | d


def ip6(text):
    if "::" in text:
        head, _, tail = text.partition("::")
        hp = [x for x in head.split(":") if x]
        tp = [x for x in tail.split(":") if x]
        parts = hp + ["0"] * (8 - len(hp) - len(tp)) + tp
    else:
        parts = text.split(":")
    value = 0
    for part in parts:
        value = (value << 16) | int(part or "0", 16)
    return value


def varint(value, out):
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return


def parse(raw):
    """-> (v4 ranges, v6 ranges, key table). A range is [lo, hi_exclusive, key]."""
    v4, v6, keys = [], [], {}
    for line in raw.decode("utf-8", "replace").splitlines():
        if not line or line[0] == "#":
            continue
        f = line.split("|")
        if len(f) < 7 or f[2] not in ("ipv4", "ipv6"):
            continue
        if f[6] not in ("allocated", "assigned"):
            continue
        registry, country, kind, start, count, date = f[0], f[1], f[2], f[3], f[4], f[5]
        if registry not in RIRS:
            continue
        # A country code is two ASCII letters or it is nothing we can use.
        if len(country) != 2 or not country.isalpha():
            country = "ZZ"
        year = int(date[:4]) if date[:4].isdigit() else 0
        key = (RIRS.index(registry), country.upper(), year)
        index = keys.setdefault(key, len(keys))
        try:
            if kind == "ipv4":
                lo = ip4(start)
                v4.append([lo, lo + int(count), index])
            else:
                lo = ip6(start)
                v6.append([lo, lo + (1 << (128 - int(count))), index])
        except (ValueError, IndexError):
            continue
    return v4, v6, keys


def merge(ranges):
    """Sort, drop overlaps, and join neighbours that say the same thing."""
    ranges.sort(key=lambda r: r[0])
    out = []
    for lo, hi, key in ranges:
        if out and lo < out[-1][1]:
            # Overlapping delegations do occur in the published data. The
            # earlier range wins and the later one is trimmed, so the file
            # can promise non-overlap and a lookup can stay a binary search.
            lo = out[-1][1]
            if lo >= hi:
                continue
        if out and out[-1][1] == lo and out[-1][2] == key:
            out[-1][1] = hi
        else:
            out.append([lo, hi, key])
    return out


def pack(v4, v6, keys, built):
    out = bytearray(b"IPSF")
    out.append(1)
    out += built.to_bytes(4, "little")
    ordered = sorted(keys, key=keys.get)
    varint(len(ordered), out)
    for rir, country, year in ordered:
        out.append(rir)
        out += country.encode("ascii")
        out += min(year, 65535).to_bytes(2, "little")
    for ranges in (v4, v6):
        varint(len(ranges), out)
        previous = 0
        for lo, hi, key in ranges:
            varint(lo - previous, out)
            varint(hi - lo, out)
            varint(key, out)
            previous = hi
    return bytes(out)


def verify(blob, v4, v6):
    """Read it back the way the app will, and check a few real addresses."""
    pos = [9]

    def rv():
        shift, value = 0, 0
        while True:
            byte = blob[pos[0]]
            pos[0] += 1
            value |= (byte & 0x7F) << shift
            if not byte & 0x80:
                return value
            shift += 7

    assert blob[:4] == b"IPSF" and blob[4] == 1
    nkeys = rv()
    table = []
    for _ in range(nkeys):
        rir = blob[pos[0]]
        country = blob[pos[0] + 1:pos[0] + 3].decode("ascii")
        year = int.from_bytes(blob[pos[0] + 3:pos[0] + 5], "little")
        pos[0] += 5
        table.append((RIRS[rir], country, year))
    sections = []
    for _ in range(2):
        n = rv()
        got, previous = [], 0
        for _ in range(n):
            lo = previous + rv()
            hi = lo + rv()
            got.append((lo, hi, rv()))
            previous = hi
        sections.append(got)
    assert len(sections[0]) == len(v4), "v4 count changed on round trip"
    assert len(sections[1]) == len(v6), "v6 count changed on round trip"
    assert [tuple(r) for r in v4] == sections[0], "v4 payload changed"
    assert [tuple(r) for r in v6] == sections[1], "v6 payload changed"

    def look(addr, section):
        lo, hi = 0, len(section) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            a, b, key = section[mid]
            if addr < a:
                hi = mid - 1
            elif addr >= b:
                lo = mid + 1
            else:
                return table[key]
        return None

    print("\nround trip, by binary search:")
    for text, addr in (("193.0.6.139", ip4("193.0.6.139")),
                       ("8.8.8.8", ip4("8.8.8.8")),
                       ("18.0.0.1", ip4("18.0.0.1")),
                       ("1.1.1.1", ip4("1.1.1.1"))):
        print("   %-14s %s" % (text, look(addr, sections[0])))
    for text in ("2a00:1450:4009:81f::200e", "2606:4700:4700::1111"):
        print("   %-14s %s" % (text[:22], look(ip6(text), sections[1])))


def main():
    raw = fetch()
    v4, v6, keys = parse(raw)
    print("parsed        v4 %7d   v6 %7d   keys %6d" % (len(v4), len(v6), len(keys)))
    v4, v6 = merge(v4), merge(v6)
    print("range-merged  v4 %7d   v6 %7d" % (len(v4), len(v6)))
    built = int(datetime.date.today().strftime("%Y%m%d"))
    blob = pack(v4, v6, keys, built)
    verify(blob, v4, v6)
    # mtime=0 so the same data always produces the same bytes - a rebuild
    # with nothing new in it should not show up as a changed file.
    squeezed = gzip.compress(blob, 9, mtime=0)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "wb").write(blob)
    # Cloudflare Pages does not compress application/octet-stream, so the
    # page fetches this pre-gzipped copy and unpacks it itself (see
    # js/21-registry.js). space.bin stays as the fallback.
    open(OUT + ".gz", "wb").write(squeezed)
    print("\nwrote %s and %s.gz" % (os.path.relpath(OUT, REPO), os.path.relpath(OUT, REPO)))
    print("   raw      %9s bytes" % format(len(blob), ","))
    print("   gzipped  %9s bytes   <- what the visitor actually downloads"
          % format(len(squeezed), ","))
    print("   built    %d" % built)
    if len(squeezed) > 520 * 1024:
        print("")
        print("WARNING: %s gzipped, well above the 439 KB this was"
              % format(len(squeezed), ","))
        print("measured at. The source or the packing changed. Check it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
