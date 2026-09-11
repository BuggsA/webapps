#!/usr/bin/env python
"""Tide — build-time global tide field prep (run once; output is committed).

EOT20 (Hart-Davis et al. 2021, DGFI-TUM; CC BY 4.0; doi:10.17882/79489)
ocean-tide NetCDF files -> apps/tide/data/tide-field.bin + tide-field.json

  For each constituent (M2 S2 N2 K2 K1 O1 P1 Q1): amplitude + Greenwich
  phase on a 1° grid (360 x 180, cell centres −179.5..179.5 / −89.5..89.5),
  land cells filled by nearest-ocean dilation so bilinear sampling near
  coasts never reads a hole (land is masked by the coastline at draw time).
  Layout per constituent: uint16 amplitude in mm, then uint8 phase in
  360/256 deg steps; little endian; constituents in the order listed in
  the JSON.

Usage:
  python scripts/tide-prep-field.py <eot20.zip | dir with *_ocean_eot20.nc>

Needs numpy + netCDF4. The zip is ~2.3 GB; only the needed members are
extracted (to a temp dir beside the zip).
"""
import json, os, re, sys, tempfile, zipfile
import numpy as np
import netCDF4

WANT = ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1']
NLON, NLAT = 360, 180
src = sys.argv[1]
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'tide', 'data')

# --- locate the files ------------------------------------------------------
files = {}
if src.lower().endswith('.zip'):
    z = zipfile.ZipFile(src)
    tmp = tempfile.mkdtemp(prefix='eot20_', dir=os.path.dirname(os.path.abspath(src)))
    for info in z.infolist():
        name = os.path.basename(info.filename)
        m = re.match(r'^([A-Z0-9]+)_ocean_eot20\.nc$', name, re.I)
        if m and m.group(1).upper() in WANT and 'load' not in info.filename.lower():
            print('extracting', info.filename, info.file_size, 'bytes')
            with z.open(info) as fin, open(os.path.join(tmp, name), 'wb') as fout:
                while True:
                    b = fin.read(1 << 22)
                    if not b: break
                    fout.write(b)
            files[m.group(1).upper()] = os.path.join(tmp, name)
else:
    for name in os.listdir(src):
        m = re.match(r'^([A-Z0-9]+)_ocean_eot20\.nc$', name, re.I)
        if m and m.group(1).upper() in WANT:
            files[m.group(1).upper()] = os.path.join(src, name)
missing = [c for c in WANT if c not in files]
if missing:
    sys.exit('missing constituents: ' + ', '.join(missing))

def pick(ds, names):
    for n in names:
        if n in ds.variables: return ds.variables[n]
    raise KeyError(names)

def fill_nearest(a):
    """Fill NaNs by iterative dilation (nearest ocean value), wrapping in lon."""
    a = a.copy()
    mask = np.isnan(a)
    it = 0
    while mask.any() and it < 400:
        it += 1
        cand = np.full_like(a, np.nan)
        cnt = np.zeros_like(a)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            s = np.roll(a, (dy, dx), axis=(0, 1))
            if dy == 1: s[0, :] = np.nan
            if dy == -1: s[-1, :] = np.nan
            ok = ~np.isnan(s) & mask
            cand[ok] = np.where(np.isnan(cand[ok]), 0, cand[ok]) + s[ok]
            cnt[ok] += 1
        fillable = mask & (cnt > 0)
        a[fillable] = cand[fillable] / cnt[fillable]
        mask = np.isnan(a)
    return a

def fill_nearest_complex(amp, pha):
    """Dilate as a complex field so phases average sensibly across the wrap."""
    z = amp * np.exp(1j * np.deg2rad(pha))
    re_, im_ = fill_nearest(z.real), fill_nearest(z.imag)
    zz = re_ + 1j * im_
    return np.abs(zz), np.rad2deg(np.angle(zz)) % 360

blob = bytearray()
report = []
for c in WANT:
    ds = netCDF4.Dataset(files[c])
    lat = np.asarray(pick(ds, ['lat', 'latitude'])[:])
    lon = np.asarray(pick(ds, ['lon', 'longitude'])[:])
    if 'amplitude' in ds.variables or 'amp' in ds.variables:
        amp = np.asarray(pick(ds, ['amplitude', 'amp'])[:], dtype='f8')
        pha = np.asarray(pick(ds, ['phase', 'pha'])[:], dtype='f8')
        units = getattr(pick(ds, ['amplitude', 'amp']), 'units', 'cm')
    else:
        re_ = np.asarray(pick(ds, ['real', 'hRe'])[:], dtype='f8'); im_ = np.asarray(pick(ds, ['imag', 'hIm'])[:], dtype='f8')
        amp = np.hypot(re_, im_); pha = np.rad2deg(np.arctan2(im_, re_)) % 360
        units = getattr(pick(ds, ['real', 'hRe']), 'units', 'cm')
    fill = getattr(pick(ds, ['amplitude', 'amp']) if 'amplitude' in ds.variables or 'amp' in ds.variables else pick(ds, ['real', 'hRe']), '_FillValue', None)
    if fill is not None:
        amp[amp == fill] = np.nan; pha[np.isnan(amp)] = np.nan
    amp[np.abs(amp) > 1e5] = np.nan; pha[np.isnan(amp)] = np.nan
    # to metres
    scale = {'cm': 0.01, 'centimeters': 0.01, 'centimetres': 0.01, 'm': 1.0, 'meters': 1.0, 'mm': 0.001}.get(str(units).lower(), 0.01)
    amp = amp * scale
    # orient: rows = lat ascending, cols = lon in −180..180 ascending
    if amp.shape != (lat.size, lon.size):
        amp = amp.T; pha = pha.T
    if lat[0] > lat[-1]:
        amp = amp[::-1]; pha = pha[::-1]; lat = lat[::-1]
    lon = np.where(lon > 180, lon - 360, lon)
    order = np.argsort(lon)
    lon = lon[order]; amp = amp[:, order]; pha = pha[:, order]
    # downsample: block-mean of the complex field per 1° cell (NaN-aware)
    ny, nx = amp.shape
    fy, fx = ny / NLAT, nx / NLON
    z = amp * np.exp(1j * np.deg2rad(pha))
    A1 = np.full((NLAT, NLON), np.nan); P1 = np.full((NLAT, NLON), np.nan)
    yi = np.floor(np.arange(ny) / fy).astype(int).clip(0, NLAT - 1)
    xi = np.floor(np.arange(nx) / fx).astype(int).clip(0, NLON - 1)
    # bin with np.add.at on real/imag + counts
    valid = ~np.isnan(z)
    sr = np.zeros((NLAT, NLON)); si = np.zeros((NLAT, NLON)); cnt = np.zeros((NLAT, NLON))
    yy, xx = np.meshgrid(yi, xi, indexing='ij')
    np.add.at(sr, (yy[valid], xx[valid]), z.real[valid])
    np.add.at(si, (yy[valid], xx[valid]), z.imag[valid])
    np.add.at(cnt, (yy[valid], xx[valid]), 1)
    has = cnt > 0
    zz = (sr + 1j * si) / np.where(has, cnt, 1)
    A1[has] = np.abs(zz[has]); P1[has] = np.rad2deg(np.angle(zz[has])) % 360
    ocean_frac = has.mean()
    # a handful of cells carry model artefacts (S2 > 30 m, P1 > 10 m): clip to
    # the 99.95th percentile of ocean cells and a hard 6 m (Fundy M2 is ~5.5 m)
    cap = min(6.0, float(np.nanpercentile(A1[has], 99.95)))
    A1 = np.where(A1 > cap, cap, A1)
    A1, P1 = fill_nearest_complex(A1, P1)
    amm = np.clip(np.round(A1 * 1000), 0, 65535).astype('<u2')
    pq = np.clip(np.round(P1 / (360 / 256)) % 256, 0, 255).astype('u1')
    blob += amm.tobytes(order='C') + pq.tobytes(order='C')
    report.append((c, units, float(np.nanmax(A1)), float(np.nanmean(A1)), ocean_frac))
    print(f'{c}: units={units} grid={ny}x{nx} max={np.nanmax(A1):.2f} m mean={np.nanmean(A1):.3f} m ocean cells={ocean_frac:.0%}')
    ds.close()

os.makedirs(out_dir, exist_ok=True)
bin_path = os.path.join(out_dir, 'tide-field.bin')
open(bin_path, 'wb').write(blob)
meta = {
    'src': 'EOT20 ocean tide (Hart-Davis et al., 2021, DGFI-TUM), CC BY 4.0, doi:10.17882/79489; downsampled to 1° by scripts/tide-prep-field.py',
    'file': 'tide-field.bin', 'constituents': WANT, 'nlon': NLON, 'nlat': NLAT,
    'lon0': -179.5, 'lat0': -89.5, 'ampScale': 0.001, 'phaseScale': 360 / 256,
    'layout': 'per constituent: uint16 LE amplitude (mm) x nlon*nlat, then uint8 phase (deg*256/360) x nlon*nlat; index = lat_row*nlon + lon_col, rows south→north',
}
json.dump(meta, open(os.path.join(out_dir, 'tide-field.json'), 'w'), indent=1)
print('wrote', bin_path, os.path.getsize(bin_path), 'bytes')
