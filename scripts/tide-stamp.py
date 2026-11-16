"""Stamp ?v=<content hash> on the local CSS/JS links of tide's hand-written pages.

The place pages get their stamps from tide-build-places.py; the pages listed
here are written by hand, so run this after changing any file they link:

    python scripts/tide-stamp.py

Only links already carrying ?v= are touched, and only to files that exist.
"""
import hashlib, os, re

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'tide')
PAGES = ['moon/index.html']
LINK = re.compile(r'((?:src|href)=")(/[^"?]+)\?v=[^"]*(")')


def stamp(m):
    path = os.path.join(APP, m.group(2).lstrip('/'))
    if not os.path.isfile(path):
        return m.group(0)
    v = hashlib.sha1(open(path, 'rb').read()).hexdigest()[:10]
    return f'{m.group(1)}{m.group(2)}?v={v}{m.group(3)}'


for page in PAGES:
    p = os.path.join(APP, page)
    src = open(p).read()
    out = LINK.sub(stamp, src)
    if out != src:
        open(p, 'w').write(out)
    print(page, 'stamped' if out != src else 'unchanged')
