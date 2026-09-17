#!/usr/bin/env python3
"""Build the population dataset for apps/ip phase 5 (the horizon).

NOT NEEDED BEFORE PHASE 5. It is here now because the source call and the
filtering rules were established and checked live on 2026-09-15, and that is
the part worth keeping; re-running it is one command.

    python scripts/ip-build-asn-field.py

Writes apps/ip/data/asns.bin  — one bit per AS number, 0..2^20-1 (128 KB)
       apps/ip/data/asns.json — the manifest: source, query time, counts

Source: RIPEstat `ris-asns` with asn_types=o, i.e. every AS observed
ORIGINATING a route by RIPE's RIS route collectors at the query time.
Keyless, CORS-open, free. Routing data by courtesy of the RIPE NCC.

Excluded, and the manifest says so:
  - 64496-131071   documentation, private-use and reserved 16-bit space
  - >= 4200000000  private-use 32-bit space
  - AS0, AS23456   not assignable / the 32-bit transition placeholder
  - anything at or above 2^20, which is outside the field (a handful of
    bogon announcements; the count is recorded rather than quietly dropped)

The layout rule the bitmap feeds is NOT decided here — see the open
decisions in docs/ip-art-direction.md. This script only records who is
active, not where they are drawn.
"""

import json
import os
import sys
import urllib.request

CALL = ("https://stat.ripe.net/data/ris-asns/data.json"
        "?list_asns=true&asn_types=o&sourceapp=whats-my-ip")
FIELD_BITS = 1 << 20
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "apps", "ip", "data")


def public(asn: int) -> bool:
    if asn == 0 or asn == 23456:
        return False
    if 64496 <= asn <= 131071:
        return False
    if asn >= 4200000000:
        return False
    return True


def main() -> int:
    print("fetching", CALL)
    with urllib.request.urlopen(CALL, timeout=120) as r:
        doc = json.load(r)

    if doc.get("status") != "ok":
        print("RIPEstat did not return ok:", doc.get("status"), file=sys.stderr)
        return 1
    data = doc["data"]
    raw = sorted({int(a) for a in data["asns"]["originating"]})
    pub = [a for a in raw if public(a)]
    inside = [a for a in pub if a < FIELD_BITS]
    outside = [a for a in pub if a >= FIELD_BITS]

    bits = bytearray(FIELD_BITS // 8)
    for a in inside:
        bits[a >> 3] |= 1 << (a & 7)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "asns.bin"), "wb") as f:
        f.write(bytes(bits))

    meta = {
        "source": "RIPE NCC RIPEstat - ris-asns (originating), RIPE RIS route collectors",
        "call": CALL,
        "query_time": data.get("query_time"),
        "active_asns": len(pub),
        "plotted": len(inside),
        "field_bits": FIELD_BITS,
        "excluded": {
            "private_reserved": len(raw) - len(pub),
            "above_field": outside,
        },
    }
    with open(os.path.join(OUT_DIR, "asns.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"originating (raw): {len(raw)}")
    print(f"public:            {len(pub)}")
    print(f"plotted:           {len(inside)}")
    print(f"above the field:   {outside}")
    print(f"wrote {OUT_DIR}/asns.bin ({len(bits)} bytes) and asns.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
