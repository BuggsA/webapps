"""Render the ip site's icons and share image into apps/ip/.

    python scripts/ip-build-icons.py      (needs: pillow, fonttools, brotli)

The mark is the one the page has always used as its favicon - the reticle:
two rings and the amber origin on the ground - drawn here at real sizes so
search engines and phones get files they can fetch. Google shows a site's
favicon cropped to a circle; the mark is concentric about the centre, so
the crop takes nothing from it. Ground is filled edge to edge (no
transparency), so it never sits on a white or grey plate.

share.png (1200x630) is the image a link preview shows: the same reticle,
the plumb axis through it, and the page's own name in Archivo.
"""
import io, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'apps', 'ip')

GROUND = (6, 8, 16)          # the favicon's own ground, #060810
RING_OUT = (59, 92, 133)     # #3b5c85
RING_IN = (43, 68, 102)      # #2b4466
AMBER = (245, 166, 35)       # --amber
CREAM = (242, 237, 227)      # --cream
COLD_2 = (143, 169, 201)     # --cold-2
COLD_4 = (42, 60, 85)        # --cold-4
SS = 8                       # supersampling for clean anti-aliased edges


def mark(size):
    """The favicon mark at `size` px, same proportions as the 32-unit SVG."""
    s = size * SS
    u = s / 32.0
    im = Image.new('RGB', (s, s), GROUND)
    d = ImageDraw.Draw(im)
    c = s / 2.0
    # Stroke width: 1 unit in the SVG, but never thinner than ~1px at output.
    w = max(u * 1.0, SS * 1.0)
    for r, col in ((10.5, RING_OUT), (5.5, RING_IN)):
        R = r * u
        d.ellipse((c - R - w / 2, c - R - w / 2, c + R + w / 2, c + R + w / 2), outline=col, width=round(w))
    R = 2.6 * u
    d.ellipse((c - R, c - R, c + R, c + R), fill=AMBER)
    return im.resize((size, size), Image.LANCZOS)


def archivo(px, weight):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    f = TTFont(os.path.join(APP, 'fonts', 'archivo-latin-var.woff2'))
    if 'fvar' in f:
        f = instancer.instantiateVariableFont(f, {'wght': weight, **({'wdth': 100} if any(a.axisTag == 'wdth' for a in f['fvar'].axes) else {})})
    f.flavor = None
    buf = io.BytesIO(); f.save(buf); buf.seek(0)
    return ImageFont.truetype(buf, px)


def share():
    W, H = 1200, 630
    s = SS // 2
    im = Image.new('RGB', (W * s, H * s), (5, 7, 13))   # --ground
    d = ImageDraw.Draw(im)
    cx, cy = 900 * s, 315 * s
    # Plumb axis: one vertical hairline through the origin.
    d.line((cx, 0, cx, H * s), fill=COLD_4, width=2 * s)
    # Polar rings, dotted, like the instrument's ground.
    import math
    for R, col, n in ((260, COLD_4, 180), (170, RING_IN, 140), (90, RING_OUT, 96)):
        for i in range(n):
            a = 2 * math.pi * i / n
            x, y = cx + R * s * math.cos(a), cy + R * s * math.sin(a)
            r = 1.6 * s
            d.ellipse((x - r, y - r, x + r, y + r), fill=col)
    # The origin.
    r = 14 * s
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=AMBER)
    # The words.
    d.text((80 * s, 230 * s), "What's my IP", font=archivo(92 * s, 260), fill=CREAM)
    d.text((84 * s, 352 * s), 'iphere.app', font=archivo(34 * s, 500), fill=COLD_2)
    return im.resize((W, H), Image.LANCZOS)


def main():
    out = lambda n: os.path.join(APP, n)
    for n in (48, 96, 192, 512):
        mark(n).save(out(f'icon-{n}.png'), optimize=True)
    mark(180).save(out('apple-touch-icon.png'), optimize=True)
    big = mark(256)
    big.save(out('favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    share().save(out('share.png'), optimize=True)
    print('wrote icon-{48,96,192,512}.png, apple-touch-icon.png, favicon.ico, share.png')


if __name__ == '__main__':
    sys.exit(main())
