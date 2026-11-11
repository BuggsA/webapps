#!/usr/bin/env python3
"""Regenerate apps/ip/MAP.md and check the app's scripts. One command:

    python scripts/ip-map.py

apps/ip used to be one 5,400-line ip.js. On 2026-11-11 the owner asked for it
to be broken up "in a way that will be most token efficient later and easy to
manage". It is now apps/ip/js/NN-name.js: classic scripts that share ONE
global scope and load in numeric order from index.html, exactly the order
the single file ran in. Nothing was rewritten to make that work, which is
why the split could be proven pixel-identical.

What this script does, and why each part exists:

  MAP.md      Written from the code, never by hand (PRODUCT_SOUL.md §8.12:
              anything that describes what exists is derived from what
              exists). A session reads the map, then opens only the one or
              two files it needs instead of all of them.
  node        `node --check` on every file. Still the only JS check here.
  order       index.html must load exactly the files in js/, in name order.
              A file added without its tag, or a tag left behind, fails.
  duplicates  A top-level name defined in two files. In one shared scope
              the later definition silently replaces the earlier one - the
              one new way the split could break things - so it is an error.
  globals     A top-level name that would shadow something the browser
              puts on window (name, status, top...). Also an error.

Exit status is non-zero if any check fails.
"""

import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
APP = os.path.join(ROOT, 'apps', 'ip')
JS = os.path.join(APP, 'js')
MAP = os.path.join(APP, 'MAP.md')

# Names a classic script must not declare at top level: each is a property of
# window that a global `var` or `function` would collide with or shadow.
WINDOW = set('''name status top parent self window frames opener closed length
location history navigator document screen origin event external print open
close stop focus blur find alert confirm prompt scroll scrollTo scrollBy fetch
performance crypto localStorage sessionStorage indexedDB caches onload onerror
postMessage setTimeout setInterval clearTimeout clearInterval requestAnimationFrame
getComputedStyle matchMedia innerWidth innerHeight devicePixelRatio menubar
toolbar statusbar personalbar locationbar scrollbars visualViewport customElements
speechSynthesis'''.split())

DECL = re.compile(r'^(?:function\s+([A-Za-z_$][\w$]*)|var\s+(.+?);?\s*(?:/\*.*)?$)')


def regex_can_start(out):
    """A '/' starts a regex, not a division, after an operator or keyword."""
    k = len(out) - 1
    while k >= 0 and out[k] in ' \t\n':
        k -= 1
    if k < 0:
        return True
    if out[k] in '(,=:[!&|?{};+-*%<>~^':
        return True
    tail = ''.join(out[max(0, k - 6):k + 1])
    return bool(re.search(r'(?:^|[^\w$])(?:return|typeof|case|in|of)$', tail))


def strip_code(src):
    """Comments and string contents out, so identifiers are only code."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            out.append(' ')
        elif src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j < 0 else j
        elif c == '/' and regex_can_start(out):
            j, cls = i + 1, False          # a regex literal: skip it whole
            while j < n and src[j] != '\n':
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '[':
                    cls = True
                elif src[j] == ']':
                    cls = False
                elif src[j] == '/' and not cls:
                    break
                j += 1
            i = j + 1
            while i < n and src[i].isalpha():
                i += 1                     # flags
            out.append('/r/')
        elif c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            i = j + 1
            out.append('""')
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def code_ids(code):
    """Identifiers used as names - not `.property` accesses, not `key:` in
    an object literal, which only look like uses of a same-named global."""
    ids = set()
    for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)(?![\w$])(?!\s*:(?!:))', code):
        ids.add(m.group(1))
    # a ternary's middle operand is followed by ':' too; take those back
    for m in re.finditer(r'\?\s*([A-Za-z_$][\w$]*)(?![\w$])\s*:', code):
        ids.add(m.group(1))
    return ids


def top_level_names(lines):
    """`function x` and `var a = .., b` at column 0 - the file's globals."""
    names = []
    for line in lines:
        m = DECL.match(line)
        if not m:
            continue
        if m.group(1):
            names.append(m.group(1))
            continue
        depth, part, parts = 0, '', []
        for ch in m.group(2):
            if ch in '([{':
                depth += 1
            elif ch in ')]}':
                depth -= 1
            if ch == ',' and depth == 0:
                parts.append(part)
                part = ''
            else:
                part += ch
        parts.append(part)
        for p in parts:
            mm = re.match(r'\s*([A-Za-z_$][\w$]*)', p)
            if mm:
                names.append(mm.group(1))
    return names


def main():
    files = sorted(f for f in os.listdir(JS) if f.endswith('.js'))
    problems = []
    info = {}
    owner = {}
    for f in files:
        src = open(os.path.join(JS, f), encoding='utf-8').read()
        lines = src.split('\n')
        first = lines[0]
        m = re.match(r'/\* apps/ip/js/[\w-]+\.js — (.*?)\.?$', first)
        purpose = m.group(1) if m else '(no purpose line)'
        names = top_level_names(lines)
        for nm in names:
            if nm in owner and owner[nm] != f:
                problems.append('duplicate: %s is defined in %s and %s' % (nm, owner[nm], f))
            owner.setdefault(nm, f)
            if nm in WINDOW:
                problems.append('global: %s in %s shadows window.%s' % (nm, f, nm))
        info[f] = {'purpose': purpose, 'lines': len(lines), 'names': names,
                   'ids': code_ids(strip_code(src))}

    for f in files:
        own = set(info[f]['names'])
        info[f]['uses'] = sorted({owner[i] for i in info[f]['ids']
                                  if i in owner and owner[i] != f and i not in own})
    for f in files:
        info[f]['usedby'] = [g for g in files if f in info[g]['uses']]

    # node --check every file
    for f in files:
        r = subprocess.run(['node', '--check', os.path.join(JS, f)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            problems.append('syntax: %s\n%s' % (f, r.stderr.strip()))

    # index.html loads exactly these, in this order
    html = open(os.path.join(APP, 'index.html'), encoding='utf-8').read()
    tags = re.findall(r'<script src="js/([^"]+)"></script>', html)
    if tags != files:
        problems.append('order: index.html loads %s but js/ holds %s' % (tags, files))

    total = sum(info[f]['lines'] for f in files)
    out = ['# apps/ip — map of the code',
           '',
           '**Generated by `python scripts/ip-map.py`. Do not edit by hand.**',
           '',
           'The app is `js/NN-name.js`: classic scripts sharing **one global scope**,',
           'loaded by `index.html` in numeric order. Order is behaviour - it is the',
           'order the single `ip.js` ran in. A name defined in one file is visible',
           'in all of them; the script fails if two files define the same name.',
           '',
           '**How to use this:** find the file whose purpose matches the task, read',
           'it whole, and read the files it *uses* only if you need them. Grep',
           '`js/` for a name to find who calls it.',
           '',
           '%d files, %d lines.' % (len(files), total),
           '',
           '| file | lines | what it is |',
           '|---|---:|---|']
    for f in files:
        out.append('| `%s` | %d | %s |' % (f, info[f]['lines'], info[f]['purpose']))
    out += ['', '## What each file defines, uses and is used by', '']
    short = lambda xs: ', '.join(x.split('-')[0] for x in xs) or '—'
    for f in files:
        i = info[f]
        out.append('### `%s`' % f)
        out.append('')
        out.append('%s. **Uses:** %s. **Used by:** %s.' %
                   (i['purpose'][0].upper() + i['purpose'][1:], short(i['uses']), short(i['usedby'])))
        out.append('')
        out.append('`' + '` `'.join(i['names']) + '`' if i['names'] else '(no top-level names)')
        out.append('')
    open(MAP, 'w', encoding='utf-8').write('\n'.join(out))

    print('MAP.md: %d files, %d lines, %d top-level names' % (len(files), total, len(owner)))
    if problems:
        print('\nPROBLEMS')
        for p in problems:
            print('  - ' + p)
        sys.exit(1)
    print('checks: syntax, load order, duplicates, window globals - all OK')


if __name__ == '__main__':
    main()
