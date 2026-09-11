#!/usr/bin/env python
"""Tide — build-time coast/land prep (run once; output is committed).

Natural Earth (public domain) GeoJSON -> compact files in apps/tide/data/:
  land-110m.json  : globe-scale land polygons, rings as flat [lon,lat,...]
                    arrays with 2-dp coordinates (for the planet view)
  land-50m.bin    : zoom-scale land polygons, int16 (lon*100, lat*100),
                    for the coast hairline, fill at zoom, and
                    distance-to-coast (vertex spacing ~1-2 km near shores)

Usage:  python scripts/tide-prep-coast.py <dir with ne_110m_land.geojson
        and ne_50m_land.geojson>
Source: https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
"""
import json, os, struct, sys

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'apps', 'tide', 'data')

def rings_of(gj):
    for f in gj['features']:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                yield ring

# --- 110m -> JSON ------------------------------------------------------------
gj = json.load(open(os.path.join(src, 'ne_110m_land.geojson'), encoding='utf-8'))
rings = []
for ring in rings_of(gj):
    flat = []
    last = None
    for lon, lat in ring:
        q = (round(lon, 2), round(lat, 2))
        if q != last:
            flat.extend(q); last = q
    if len(flat) >= 8:
        rings.append(flat)
p = os.path.join(out, 'land-110m.json')
json.dump({'src': 'Natural Earth 110m land (public domain)', 'rings': rings},
          open(p, 'w'), separators=(',', ':'))
print('land-110m.json', len(rings), 'rings', sum(len(r)//2 for r in rings), 'pts', os.path.getsize(p), 'bytes')

# --- 50m -> binary -----------------------------------------------------------
gj = json.load(open(os.path.join(src, 'ne_50m_land.geojson'), encoding='utf-8'))
buf = bytearray()
n = 0; npts = 0
body = bytearray()
for ring in rings_of(gj):
    pts = []
    last = None
    for lon, lat in ring:
        q = (max(-18000, min(18000, int(round(lon * 100)))), max(-9000, min(9000, int(round(lat * 100)))))
        if q != last:
            pts.append(q); last = q
    if len(pts) < 4:
        continue
    body += struct.pack('<I', len(pts))
    for lon, lat in pts:
        body += struct.pack('<hh', lon, lat)
    n += 1; npts += len(pts)
buf += struct.pack('<4sI', b'TCST', n) + body
p = os.path.join(out, 'land-50m.bin')
open(p, 'wb').write(buf)
print('land-50m.bin', n, 'rings', npts, 'pts', os.path.getsize(p), 'bytes')
